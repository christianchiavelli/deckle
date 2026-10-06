import { Logger, runMigrations, type MigrationDiagnostic, type VendureConfig } from '@vendure/core';
import pg from 'pg';

const loggerCtx = 'Migrations';

/** An arbitrary key for the advisory lock that serialises migrations across processes. */
const MIGRATION_LOCK = 4_242_003;

export class SchemaDriftError extends Error {
  override readonly name = 'SchemaDriftError';
}

/**
 * Runs the committed migrations, then refuses to go on if the database still differs
 * from what the config describes: a missing migration fails at start-up, not on the
 * first query that touches the column.
 *
 * TypeORM takes no lock of its own, so two servers starting together would both run
 * the same migration; a Postgres advisory lock makes the second wait and find nothing
 * left to do.
 */
export async function migrateDatabase(
  config: VendureConfig,
  databaseUrl: string,
): Promise<string[]> {
  const lock = new pg.Client({
    connectionString: databaseUrl,
    application_name: 'commerce-migrations',
  });
  await lock.connect();
  // Vendure prints its own report unless told the caller renders it, and with that flag
  // it throws on a failed migration instead of only setting `process.exitCode`.
  const renderedByCaller = process.env['VENDURE_RUNNING_IN_CLI'];
  process.env['VENDURE_RUNNING_IN_CLI'] = 'true';
  try {
    await lock.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    const diagnostics: MigrationDiagnostic[] = [];
    const ran = await runMigrations(config, {
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    for (const name of ran) {
      Logger.info(`Ran migration ${name}`, loggerCtx);
    }
    for (const diagnostic of diagnostics) {
      Logger.error(diagnostic.lines.join('\n'), loggerCtx);
    }
    if (diagnostics.length > 0) {
      throw new SchemaDriftError(
        'The database does not match the configuration; generate a migration with ' +
          '`pnpm --filter @deckle/commerce migration:generate <name>`',
      );
    }
    return ran;
  } finally {
    if (renderedByCaller === undefined) {
      delete process.env['VENDURE_RUNNING_IN_CLI'];
    } else {
      process.env['VENDURE_RUNNING_IN_CLI'] = renderedByCaller;
    }
    await lock.end();
  }
}
