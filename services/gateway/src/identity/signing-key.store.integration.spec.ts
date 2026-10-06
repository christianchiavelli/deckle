import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { connectMigrated, startPostgres } from '../../test/support/postgres.js';
import { KEY_CREATION_LOCK, PgSigningKeyStore } from './signing-key.store.js';
import { signingKeys } from './signing-keys.table.js';
import { generateSigningKey } from './signing-keys.service.js';

describe('PgSigningKeyStore on Postgres 18', () => {
  it('creates a single first key when replicas start together, and keeps it', async () => {
    await using postgres = await startPostgres();
    await using a = await connectMigrated(postgres.getConnectionUri());
    await using b = await connectMigrated(postgres.getConnectionUri());
    const generate = vi.fn(generateSigningKey);

    const [onA, onB] = await Promise.all([
      new PgSigningKeyStore(a.db).ensureActiveKey(generate),
      new PgSigningKeyStore(b.db).ensureActiveKey(generate),
    ]);
    const later = await new PgSigningKeyStore(b.db).ensureActiveKey(generate);

    expect(generate).toHaveBeenCalledOnce();
    expect(onB.kid).toBe(onA.kid);
    expect(later.kid).toBe(onA.kid);
    expect(later.privateJwk).toEqual(onA.privateJwk);
    expect(await a.db.$count(signingKeys)).toBe(1);
  });

  it('finds a key created while it waited for the lock, though its transaction began first', async () => {
    await using postgres = await startPostgres();
    await using a = await connectMigrated(postgres.getConnectionUri());
    await using b = await connectMigrated(postgres.getConnectionUri());
    const holder = await a.pool.connect();
    await holder.query('select pg_advisory_lock(hashtext($1))', [KEY_CREATION_LOCK]);
    const generate = vi.fn(generateSigningKey);

    // B's transaction begins and queues for the lock; another replica's key is
    // committed meanwhile, later than B's transaction began.
    const waiting = new PgSigningKeyStore(b.db).ensureActiveKey(generate);
    await vi.waitFor(async () => {
      const { rows } = await a.pool.query<{ waiting: number }>(
        "select count(*)::int as waiting from pg_locks where locktype = 'advisory' and not granted",
      );
      expect(rows[0]?.waiting).toBe(1);
    });
    const first = await generateSigningKey();
    await a.db.insert(signingKeys).values(first);
    await holder.query('select pg_advisory_unlock(hashtext($1))', [KEY_CREATION_LOCK]);
    holder.release();

    const found = await waiting;

    expect(generate).not.toHaveBeenCalled();
    expect(found.kid).toBe(first.kid);
    expect(await a.db.$count(signingKeys)).toBe(1);
  });

  it('publishes the next key before signing with it, and a retired key for an hour', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const [active, next, justRetired, longRetired] = await Promise.all([
      generateSigningKey(),
      generateSigningKey(),
      generateSigningKey(),
      generateSigningKey(),
    ]);
    await connection.db.insert(signingKeys).values([
      {
        ...longRetired,
        notBefore: sql`now() - interval '3 days'`,
        notAfter: sql`now() - interval '61 minutes'`,
      },
      {
        ...justRetired,
        notBefore: sql`now() - interval '2 days'`,
        notAfter: sql`now() - interval '59 minutes'`,
      },
      { ...active, notBefore: sql`now() - interval '1 day'` },
      { ...next, notBefore: sql`now() + interval '1 day'` },
    ]);
    const store = new PgSigningKeyStore(connection.db);
    const generate = vi.fn(generateSigningKey);

    const signing = await store.ensureActiveKey(generate);
    const published = await store.publishedKeys();

    expect(generate).not.toHaveBeenCalled();
    expect(signing.kid).toBe(active.kid);
    expect(published.map((key) => key.kid)).toEqual([next.kid, active.kid, justRetired.kid]);
    expect(published.every((key) => key.d === undefined)).toBe(true);
  });
});
