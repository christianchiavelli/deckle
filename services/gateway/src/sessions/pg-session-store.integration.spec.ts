import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { connectMigrated, startPostgres } from '../../test/support/postgres.js';
import { PgAccountStore } from '../accounts/pg-account-store.js';
import { users } from '../accounts/users.table.js';
import { PgSessionStore } from './pg-session-store.js';
import type { SessionRecord } from './session-store.js';

const DAY = 24 * 60 * 60 * 1000;

const session = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: randomUUID(),
  userId: null,
  cartToken: null,
  customerToken: null,
  expiresAt: new Date(Date.now() + 30 * DAY),
  ...overrides,
});

/** Renewal as the gateway asks it: thirty days more, if last seen over a day ago. */
const renewal = () => ({
  until: new Date(Date.now() + 30 * DAY),
  ifSeenBefore: new Date(Date.now() - DAY),
});

describe('PgSessionStore on Postgres 18', () => {
  it('finds a live session, and renews it only when it was last seen long enough ago', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const store = new PgSessionStore(connection.db);
    const guest = session({ cartToken: 'commerce-guest-token' });
    await store.replace(null, guest);

    expect(await store.find(guest.id, renewal())).toEqual({ session: guest, renewed: false });

    await connection.pool.query("update sessions set seen_at = now() - interval '2 days'");
    const due = renewal();
    const found = await store.find(guest.id, due);
    expect(found?.renewed).toBe(true);
    expect(found?.session.expiresAt).toEqual(due.until);
    expect(await store.find(randomUUID(), renewal())).toBeNull();
  });

  it('opens nothing once a session has expired, and deletes it on the next sweep', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const store = new PgSessionStore(connection.db);
    const expired = session({ expiresAt: new Date(Date.now() - 1000) });
    const live = session();
    await store.replace(null, expired);
    await store.replace(null, live);

    expect(await store.find(expired.id, renewal())).toBeNull();
    expect(await store.deleteExpired()).toBe(1);
    expect(await store.deleteExpired()).toBe(0);
    expect((await store.find(live.id, renewal()))?.session.id).toBe(live.id);
  });

  it('swaps a session for the next in one step, as a sign-in does', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const store = new PgSessionStore(connection.db);
    const userId = randomUUID();
    await connection.db.insert(users).values({ id: userId });
    const guest = session({ cartToken: 'cart' });
    await store.replace(null, guest);
    await store.update(guest.id, { customerToken: 'customer' });
    expect((await store.find(guest.id, renewal()))?.session.customerToken).toBe('customer');

    const signedIn = session({ userId, cartToken: 'cart' });
    await store.replace(guest.id, signedIn);

    expect(await store.find(guest.id, renewal())).toBeNull();
    expect((await store.find(signedIn.id, renewal()))?.session).toEqual(signedIn);
  });

  it('takes a ceremony under way with the session that began it', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const store = new PgSessionStore(connection.db);
    const accounts = new PgAccountStore(connection.db);
    const expired = session({ expiresAt: new Date(Date.now() - 1000) });
    await store.replace(null, expired);
    await accounts.beginCeremony(
      expired.id,
      { purpose: 'sign-in', challenge: 'challenge', userId: null },
      new Date(Date.now() + 60_000),
    );

    await store.deleteExpired();

    expect(await accounts.takeCeremony(expired.id)).toBeNull();
  });
});
