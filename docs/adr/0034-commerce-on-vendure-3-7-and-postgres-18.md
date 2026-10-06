# Commerce runs Vendure 3.7.4 on Postgres 18, with committed migrations

- Status: accepted
- Date: 2026-10-05
- Scope: `services/commerce`

## Context

Commerce is the catalogue, cart, checkout and orders behind the gateway. It has to run the same way in three processes from one image (server, worker, one-shot seed), on the Postgres 18 every Deckle service shares, without Redis, and with plugins already shaped for Vendure 3.8. Postgres 16 was the fallback if Vendure or TypeORM could not handle 18.

## Decision

**Versions.** `@vendure/core`, `common`, `asset-server-plugin`, `email-plugin`, `dashboard` and `testing` at exactly 3.7.4; TypeORM 0.3.31 (the version Vendure 3.7.4 resolves, pinned in the catalog so the migrations import that one copy); `pg` 8.23.1; `postgres:18.6-alpine3.24`. Vendure 3.7.4 runs on NestJS 11 while the gateway is on 12, so a named catalog `vendure` pins `@nestjs/common` 11.2.7 for commerce: a plugin's decorators must come from the instance Vendure loads.

**Postgres 18, no fallback needed.** The schema was generated against 18.6, and the integration suite runs on it in Testcontainers: migrations, the seed twice, the Shop and Admin APIs, the `deckle` sign-in and hook delivery. Nothing needed Postgres 16.

**Schema by migration.** `synchronize: false` and `migrationsRun: false`. The server and the seed call `migrateDatabase()` at start: Vendure's `runMigrations()` behind a Postgres advisory lock, so two processes starting together do not run the same migration twice, then a drift check (`onDiagnostic`) that refuses to start when the configuration, custom fields included, no longer matches the database. `migration:generate <name>` writes the next migration from that difference.

**Admin.** The React dashboard, built by `@vendure/dashboard/vite` on Vite 8.3.2 into `dist/dashboard` and served by `DashboardPlugin` at `/dashboard`. The Angular admin is not installed.

**Queues on Postgres.** `DefaultJobQueuePlugin`: hooks, search indexing and collection filters are polled every 500 ms, the rest every 2 s (Vendure polls every queue every 200 ms by default, some 25 locking queries a second against an idle database); a running job gets 15 s to finish on shutdown, under compose's 20 s grace. `DefaultSchedulerPlugin` runs Vendure 3.7's own scheduled tasks (expired sessions, old jobs) on the worker. `DefaultSearchPlugin` indexes stock status.

**Telemetry off.** Vendure reads `VENDURE_DISABLE_TELEMETRY` from the process environment (`core/src/telemetry/helpers/is-telemetry-disabled.helper.ts`). The environment schema requires it to be `true`, so telemetry on is a configuration error; the tools that boot Vendure outside compose set it themselves.

## Consequences

- A change to custom fields or to a plugin's entities fails start-up until its migration is generated and committed, which is the point.
- Every process polls the queue tables; at Deckle's volume this is cheaper than adding Redis.
- The production image carries `@vendure/dashboard`'s dependencies, because `DashboardPlugin` ships in that package; the built dashboard itself is static.
- Moving to Vendure 3.8 means dropping the `vendure` catalog once it runs on NestJS 12.

## Rejected

- `synchronize: true`: DDL nobody reviews, and a renamed field becomes a dropped column.
- `migrationsRun: true`: runs in every process, the worker included, with no lock and no drift check.
- Postgres 16: nothing required it.
- BullMQ on Redis for the job queue: one more service the brief rules out.
