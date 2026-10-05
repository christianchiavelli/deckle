# 9. Drizzle 0.45, without the relational query API

- Status: accepted
- Date: 2026-10-05

## Context

The gateway owns a few tables of its own: drops and their numbered copies, signing keys, sessions, processed webhooks. The drop needs explicit row locks (`FOR UPDATE SKIP LOCKED`) inside a transaction. Drizzle 1.0 is still a release candidate, and it reworks the relational query API.

## Decision

The gateway uses **Drizzle ORM 0.45.3** with drizzle-kit migrations, writing queries with the **SQL-like builder** only, **never the relational query API v1**.

## Consequences

- Queries read like the SQL they produce, which is what a row lock needs.
- Moving to Drizzle 1.0 becomes mechanical, since the API that changes most is not used.
- Joins are written by hand where the relational API would infer them.

## Alternatives considered

- **Drizzle 1.0 RC:** the future API, before it is stable.
- **Prisma:** a heavier client and less direct control over locking.
- **Raw `pg`:** the most control, without typed queries or migrations.
