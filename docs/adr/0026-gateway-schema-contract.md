# 26. The gateway's schema is a committed contract

- Status: accepted
- Date: 2026-10-05
- Versions: @nestjs/graphql 14.0.3, graphql 16.14.2, @graphql-inspector/cli 7.0.0

## Context

The schema is written code first, but the store and any other client code against SDL. A change that removes or narrows a field must be visible in review and must fail CI unless it is meant.

## Decision

- `services/gateway/schema.gql` is committed and sorted lexicographically, so a diff shows only real changes. Prettier ignores it.
- `pnpm --filter @deckle/gateway schema:generate` writes it, and `schema:check` fails when it differs from the code. Both build the schema with `GraphQLSchemaFactory` from the gateway's resolver list and options, without starting the app or connecting to anything.
- A unit test asserts the same two things: the file matches the generated schema, and the generated schema matches what the running app serves. A resolver missing from the list therefore fails `pnpm test`.
- `schema:diff [ref]` compares the file with the one in `HEAD~1` (or `ref`) using GraphQL Inspector, and fails on a breaking change. It passes when the base has no schema yet, and exits 2 when the base is not in the clone, so a shallow CI checkout fails loudly instead of passing.
- At runtime, the app builds its schema in memory (`autoSchemaFile: true`). It never writes the file, because the image is read-only to the process and replicas would race.

## Consequences

- An intended breaking change needs a deliberate step: the commit that makes it explains it, and CI's diff step is overridden for that change.
- The generator needs a fresh build (`nest build`) to read the decorators, which adds a few seconds to `schema:check`.

## Rejected

- **Schema first**: every type would be written twice, once in SDL and once in TypeScript.
- **Snapshotting introspection from a running gateway**: it needs Postgres and the upstreams just to read a schema.
