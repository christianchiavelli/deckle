import { fileURLToPath } from 'node:url';
import type { LoggerService } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type pg from 'pg';

/** drizzle-kit writes the SQL here; it ships in the image next to `dist`. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

const MIGRATION_LOCK = 'deckle-gateway:migrations';

/**
 * Applies the pending migrations, one replica at a time.
 *
 * Drizzle reads which migrations ran before it opens its transaction, so two
 * replicas starting together would both apply the same one. A session advisory
 * lock makes the second wait, then find nothing left to do. The connection is
 * destroyed afterwards, which releases the lock even if unlocking failed.
 */
export async function runMigrations(pool: pg.Pool, logger: LoggerService): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK]);
    const startedAt = performance.now();
    await migrate(drizzle({ client }), { migrationsFolder: MIGRATIONS_FOLDER });
    logger.log(`Migrations are up to date (${Math.round(performance.now() - startedAt)} ms)`);
  } finally {
    client.release(true);
  }
}
