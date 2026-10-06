import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/** The image compose runs, so the tests meet the same Postgres. */
export const postgresImage = 'postgres:18.6-alpine3.24';

export function startPostgres(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(postgresImage)
    .withDatabase('cms')
    .withUsername('cms')
    .withPassword('cms')
    .start();
}
