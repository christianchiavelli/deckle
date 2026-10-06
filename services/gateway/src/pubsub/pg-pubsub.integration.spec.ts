import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { backendPids, connect, startPostgres } from '../../test/support/postgres.js';
import type { Env } from '../config/env.js';
import { NOTIFY_PAYLOAD_LIMIT_BYTES, PayloadTooLargeError, PgPubSub } from './pg-pubsub.js';

const counter = z.object({ n: z.int() });
const padded = z.object({ padding: z.string() });

/** One replica's pub/sub: its own pool, and its own listener connection. */
async function replica(url: string) {
  const connection = connect(url);
  const pubSub = new PgPubSub(connection.db, new ConfigService<Env, true>({ DATABASE_URL: url }));
  await pubSub.onModuleInit();
  return {
    ...connection,
    pubSub,
    async [Symbol.asyncDispose]() {
      await pubSub.onApplicationShutdown();
      await connection[Symbol.asyncDispose]();
    },
  };
}

/** Collects what a subscription yields, in the background. */
function collect<T>(subscription: AsyncIterableIterator<T>): T[] {
  const received: T[] = [];
  void (async () => {
    for await (const value of subscription) received.push(value);
  })();
  return received;
}

describe('PgPubSub on Postgres 18', () => {
  it('delivers an event published on one replica to subscribers on every replica', async () => {
    await using postgres = await startPostgres();
    await using a = await replica(postgres.getConnectionUri());
    await using b = await replica(postgres.getConnectionUri());
    const onA = a.pubSub.subscribe('topic', counter);
    const onB = b.pubSub.subscribe('topic', counter);

    await a.pubSub.publish('topic', { n: 1 });

    await expect(onA.next()).resolves.toEqual({ value: { n: 1 }, done: false });
    await expect(onB.next()).resolves.toEqual({ value: { n: 1 }, done: false });
    await onA.return?.();
    await onB.return?.();
  });

  it('sends an event published in a transaction on commit, and never on rollback', async () => {
    await using postgres = await startPostgres();
    await using a = await replica(postgres.getConnectionUri());
    await using b = await replica(postgres.getConnectionUri());
    const subscription = b.pubSub.subscribe('topic', counter);
    const received = collect(subscription);

    await a.db
      .transaction(async (transaction) => {
        await a.pubSub.publish('topic', { n: 1 }, transaction);
        throw new Error('roll back');
      })
      .catch(() => undefined);
    await a.db.transaction(async (transaction) => {
      await a.pubSub.publish('topic', { n: 2 }, transaction);
      await transaction.execute(sql`select pg_sleep(0.3)`);
      expect(received).toEqual([]);
    });

    await vi.waitFor(() => {
      expect(received).toEqual([{ n: 2 }]);
    });
    await subscription.return?.();
  });

  it('carries the largest payload NOTIFY allows, and refuses a larger one before Postgres does', async () => {
    await using postgres = await startPostgres();
    await using a = await replica(postgres.getConnectionUri());
    const overhead = JSON.stringify({ topic: 'topic', payload: { padding: '' } }).length;
    const largest = 'x'.repeat(NOTIFY_PAYLOAD_LIMIT_BYTES - 1 - overhead);
    const subscription = a.pubSub.subscribe('topic', padded);

    await a.pubSub.publish('topic', { padding: largest });

    await expect(subscription.next()).resolves.toEqual({
      value: { padding: largest },
      done: false,
    });
    await expect(a.pubSub.publish('topic', { padding: `${largest}x` })).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
    await subscription.return?.();
  });

  it('listens again on a new connection after Postgres drops it, keeping its subscribers', async () => {
    await using postgres = await startPostgres();
    await using a = await replica(postgres.getConnectionUri());
    await using b = await replica(postgres.getConnectionUri());
    const subscription = b.pubSub.subscribe('topic', counter);
    const dropped = await backendPids(a.pool, 'deckle-gateway-listener');
    expect(dropped).toHaveLength(2);

    await a.pool.query('select pg_terminate_backend(pid) from unnest($1::int[]) as pid', [dropped]);

    await vi.waitFor(
      async () => {
        const listeners = await backendPids(a.pool, 'deckle-gateway-listener');
        expect(listeners).toHaveLength(2);
        expect(listeners.filter((pid) => dropped.includes(pid))).toEqual([]);
        expect(b.pubSub.isListening()).toBe(true);
      },
      { timeout: 10_000, interval: 100 },
    );
    await a.pubSub.publish('topic', { n: 3 });

    await expect(subscription.next()).resolves.toEqual({ value: { n: 3 }, done: false });
    await subscription.return?.();
  });
});
