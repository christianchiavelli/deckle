import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { connectMigrated, startPostgres } from '../../test/support/postgres.js';
import { PgSessionStore } from '../sessions/pg-session-store.js';
import type { NewPasskey } from './account-store.js';
import { PgAccountStore } from './pg-account-store.js';

const passkey = (userId: string): NewPasskey => ({
  id: `credential-${randomUUID()}`,
  userId,
  publicKey: 'pQECAyYgASFYIA',
  counter: 0,
  transports: ['internal', 'hybrid'],
  deviceType: 'multiDevice',
  backedUp: true,
});

async function withSession(url: string) {
  const connection = await connectMigrated(url);
  const sessionId = randomUUID();
  await new PgSessionStore(connection.db).replace(null, {
    id: sessionId,
    userId: null,
    cartToken: null,
    customerToken: null,
    expiresAt: new Date(Date.now() + 60_000),
  });
  return {
    connection,
    sessionId,
    store: new PgAccountStore(connection.db),
    [Symbol.asyncDispose]: () => connection.pool.end(),
  };
}

describe('PgAccountStore on Postgres 18', () => {
  it('serves a ceremony once, the last one begun, and none that ran out', async () => {
    await using postgres = await startPostgres();
    await using setup = await withSession(postgres.getConnectionUri());
    const { sessionId, store } = setup;
    const soon = new Date(Date.now() + 60_000);
    const userId = randomUUID();

    await store.beginCeremony(
      sessionId,
      { purpose: 'sign-in', challenge: 'first', userId: null },
      soon,
    );
    await store.beginCeremony(
      sessionId,
      { purpose: 'register', challenge: 'second', userId },
      soon,
    );

    const taken = await Promise.all([store.takeCeremony(sessionId), store.takeCeremony(sessionId)]);
    expect(taken.filter((ceremony) => ceremony !== null)).toEqual([
      { purpose: 'register', challenge: 'second', userId },
    ]);

    await store.beginCeremony(
      sessionId,
      { purpose: 'sign-in', challenge: 'late', userId: null },
      new Date(Date.now() - 1000),
    );
    expect(await store.takeCeremony(sessionId)).toBeNull();
  });

  it('refuses a ceremony that mixes up its purpose and its account', async () => {
    await using postgres = await startPostgres();
    await using setup = await withSession(postgres.getConnectionUri());
    const { connection, sessionId } = setup;

    await expect(
      connection.pool.query(
        "insert into passkey_ceremonies (session_id, purpose, challenge, user_id, expires_at) values ($1, 'register', 'c', null, now())",
        [sessionId],
      ),
    ).rejects.toThrow(/passkey_ceremonies_purpose_check/);
  });

  it('makes an account and its passkey together, and keeps its counter from going back', async () => {
    await using postgres = await startPostgres();
    await using setup = await withSession(postgres.getConnectionUri());
    const { store } = setup;
    const userId = randomUUID();
    const made = passkey(userId);

    await store.createAccount(made);

    expect(await store.findPasskey(made.id)).toEqual({
      id: made.id,
      userId,
      publicKey: made.publicKey,
      counter: 0,
      transports: ['internal', 'hybrid'],
    });
    expect((await store.account(userId))?.id).toBe(userId);
    await store.usedPasskey(made.id, 7);
    await store.usedPasskey(made.id, 3);
    expect((await store.findPasskey(made.id))?.counter).toBe(7);
    expect(await store.findPasskey('unknown')).toBeNull();
    expect(await store.account(randomUUID())).toBeNull();
  });

  it('leaves no account behind when its passkey cannot be kept', async () => {
    await using postgres = await startPostgres();
    await using setup = await withSession(postgres.getConnectionUri());
    const { store } = setup;
    const first = passkey(randomUUID());
    await store.createAccount(first);
    const userId = randomUUID();

    // The same credential id twice: the second account must not survive without it.
    await expect(store.createAccount({ ...first, userId })).rejects.toThrow();

    expect(await store.account(userId)).toBeNull();
  });
});
