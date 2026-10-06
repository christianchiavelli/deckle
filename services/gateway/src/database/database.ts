import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * The gateway's Drizzle instance. It is created without a schema on purpose:
 * queries use the SQL-like builder only, never the relational query API, so the
 * move to Drizzle 1.0 (which replaces that API) is mechanical.
 */
export type Database = NodePgDatabase;

/** Injection token for the `Database`. */
export const DATABASE = Symbol('Database');

/**
 * Injection token for the `pg.Pool`. `pg` is CommonJS, reached through a default
 * import, and decorator metadata cannot name a class reached that way: the
 * constructor type would be recorded as `Object`, so the token is explicit.
 */
export const PG_POOL = Symbol('PgPool');

/** Anything that can run a statement: the database itself or an open transaction. */
export type SqlExecutor = Pick<Database, 'execute'>;
