import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { connectMigrated, startPostgres } from '../../test/support/postgres.js';
import { PgSigningKeyStore } from './signing-key.store.js';
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
