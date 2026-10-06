import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { connectMigrated, startPostgres } from '../../test/support/postgres.js';
import { PgWebhookDeliveries } from './pg-webhook-deliveries.js';
import { webhookDeliveries } from './webhook-deliveries.table.js';

const delivery = () => ({ id: randomUUID(), source: 'commerce', type: 'price' }) as const;

/** Work that keeps its delivery's transaction open until the test lets it finish or fail. */
function heldWork() {
  const started = Promise.withResolvers<undefined>();
  const outcome = Promise.withResolvers<undefined>();
  return {
    work: () => {
      started.resolve(undefined);
      return outcome.promise;
    },
    started: started.promise,
    finish: () => {
      outcome.resolve(undefined);
    },
    fail: (error: Error) => {
      outcome.reject(error);
    },
  };
}

/** Backends of this database waiting on a lock: a duplicate held up by the first delivery's row. */
async function waitingOnLocks(pool: pg.Pool): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    "select count(*) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'",
  );
  return Number(rows[0]?.count);
}

describe('PgWebhookDeliveries on Postgres 18', () => {
  it('does the work for the first delivery of an id and skips every redelivery', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const deliveries = new PgWebhookDeliveries(connection.db);
    const work = vi.fn(() => Promise.resolve());
    const key = delivery();

    await expect(deliveries.once(key, work)).resolves.toBe('processed');
    await expect(deliveries.once(key, work)).resolves.toBe('duplicate');
    await expect(deliveries.once(delivery(), work)).resolves.toBe('processed');

    expect(work).toHaveBeenCalledTimes(2);
  });

  it('holds a concurrent duplicate until the first delivery commits, then skips it', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const deliveries = new PgWebhookDeliveries(connection.db);
    const key = delivery();
    const held = heldWork();
    const duplicateWork = vi.fn(() => Promise.resolve());

    const first = deliveries.once(key, held.work);
    await held.started;
    const duplicate = deliveries.once(key, duplicateWork);
    await vi.waitFor(async () => {
      expect(await waitingOnLocks(connection.pool)).toBe(1);
    });
    held.finish();

    await expect(first).resolves.toBe('processed');
    await expect(duplicate).resolves.toBe('duplicate');
    expect(duplicateWork).not.toHaveBeenCalled();
  });

  it('lets the held duplicate do the work when the first delivery fails', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const deliveries = new PgWebhookDeliveries(connection.db);
    const key = delivery();
    const held = heldWork();
    const duplicateWork = vi.fn(() => Promise.resolve());

    const first = deliveries.once(key, held.work);
    await held.started;
    const duplicate = deliveries.once(key, duplicateWork);
    await vi.waitFor(async () => {
      expect(await waitingOnLocks(connection.pool)).toBe(1);
    });
    held.fail(new Error('the store did not answer'));

    await expect(first).rejects.toThrow('the store did not answer');
    await expect(duplicate).resolves.toBe('processed');
    expect(duplicateWork).toHaveBeenCalledOnce();
  });

  it('forgets deliveries older than seven days and keeps the rest', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const deliveries = new PgWebhookDeliveries(connection.db);
    const [expired, recent] = [delivery(), delivery()];
    await connection.db.insert(webhookDeliveries).values([
      { ...expired, receivedAt: sql`now() - interval '7 days 1 minute'` },
      { ...recent, receivedAt: sql`now() - interval '6 days 23 hours'` },
    ]);

    await expect(deliveries.purgeExpired()).resolves.toBe(1);

    const kept = await connection.db.select({ id: webhookDeliveries.id }).from(webhookDeliveries);
    expect(kept).toEqual([{ id: recent.id }]);
  });
});
