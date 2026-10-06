import { Logger } from '@nestjs/common';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Database } from '../../src/database/database.js';
import { runMigrations } from '../../src/database/migrations.js';

/** The image compose runs, so the tests meet the same Postgres. */
export const POSTGRES_IMAGE = 'postgres:18.6-alpine3.24';

/** A fresh Postgres 18 with the gateway's database and role, removed by `await using`. */
export function startPostgres(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('gateway')
    .withUsername('gateway')
    .withPassword('gateway')
    .start();
}

export interface Connection extends AsyncDisposable {
  readonly pool: pg.Pool;
  readonly db: Database;
}

/** A pool on `url` and its Drizzle instance, closed by `await using`. */
export function connect(url: string): Connection {
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return { pool, db: drizzle({ client: pool }), [Symbol.asyncDispose]: () => pool.end() };
}

/** A connection to a database with the gateway's schema in place. */
export async function connectMigrated(url: string): Promise<Connection> {
  const connection = connect(url);
  await runMigrations(connection.pool, new Logger('Migrations'));
  return connection;
}

/** Backend pids of the connections a given application opened, to watch them come and go. */
export async function backendPids(pool: pg.Pool, applicationName: string): Promise<number[]> {
  const { rows } = await pool.query<{ pid: number }>(
    'select pid from pg_stat_activity where application_name = $1 order by pid',
    [applicationName],
  );
  return rows.map((row) => row.pid);
}
