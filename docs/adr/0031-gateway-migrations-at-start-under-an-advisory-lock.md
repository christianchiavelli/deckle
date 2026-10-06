# 31. Gateway migrations at start-up, under an advisory lock

- Status: accepted
- Date: 2026-10-05
- Versions: drizzle-orm 0.45.3, drizzle-kit 0.31.11, Postgres 18.6

## Context

The gateway owns its tables: `webhook_deliveries` and `signing_keys` now, passkeys and sessions later. Compose may start two gateway replicas at once, and both see a database that needs the same migration.

## Decision

- Tables are declared next to their feature as `src/**/*.table.ts`. `pnpm --filter @deckle/gateway db:generate --name <change>` writes reviewed SQL into `services/gateway/drizzle/`, and that folder is committed and shipped in the image.
- The process applies pending migrations in `DatabaseLifecycle.onModuleInit`, before it listens on its port. It takes a dedicated connection and holds a session-level `pg_advisory_lock(hashtext('deckle-gateway:migrations'))` while Drizzle's migrator runs. Afterwards it destroys that connection rather than returning it to the pool, so the lock can never leak into another query.
- A replica that starts second waits on the lock, then finds nothing to do. The integration suite runs two migrators against one Postgres 18 at once; a boot of two containers from the image did the same.
- New features add tables the same way. Passkey credentials, sessions and drop reservations each get a `*.table.ts` and a generated migration, and need no new machinery.

## Consequences

- The image needs no extra entry point or tool: no drizzle-kit, no dev dependencies.
- A long migration delays the readiness of every replica, since they all wait on the lock. The healthcheck's 30 s start period covers today's migrations; a heavy data migration would need to run as a separate job.
- Migrations must keep working with the previous release while old replicas drain (expand, then contract).
- The runtime role needs DDL rights on its own database. That is acceptable locally; production would split a migrator role from the runtime role.

## Rejected

- **A one-shot `migrate` service in compose** (`depends_on: condition: service_completed_successfully`): it is sound, but it is one more service and entry point to keep in step with the image, for a lock that already makes the in-process run safe. It is the way out if migrations grow slow.
- **`drizzle-kit push` or `migrate` in the image**: it puts a dev tool in production, and `push` skips the reviewed SQL.
