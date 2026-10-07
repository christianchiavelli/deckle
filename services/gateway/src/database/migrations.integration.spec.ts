import { readdir } from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { connect, startPostgres } from '../../test/support/postgres.js';
import { MIGRATIONS_FOLDER, runMigrations } from './migrations.js';

const logger = new Logger('Migrations');

async function appliedMigrations(pool: pg.Pool): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'select count(*) from drizzle.__drizzle_migrations',
  );
  return Number(rows[0]?.count);
}

describe('runMigrations on Postgres 18', () => {
  it('applies each migration once when replicas start together, and nothing on a later start', async () => {
    await using postgres = await startPostgres();
    await using first = connect(postgres.getConnectionUri());
    await using second = connect(postgres.getConnectionUri());
    const migrations = (await readdir(MIGRATIONS_FOLDER)).filter((file) => file.endsWith('.sql'));

    await Promise.all([runMigrations(first.pool, logger), runMigrations(second.pool, logger)]);

    expect(await appliedMigrations(first.pool)).toBe(migrations.length);
    const { rows } = await first.pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    expect(rows.map((row) => row.table_name)).toEqual([
      'drop_copies',
      'drops',
      'passkey_ceremonies',
      'passkeys',
      'sessions',
      'signing_keys',
      'users',
      'webhook_deliveries',
    ]);

    await runMigrations(second.pool, logger);

    expect(await appliedMigrations(second.pool)).toBe(migrations.length);
  });
});
