# 6. graphql 16

- Status: accepted
- Date: 2026-10-05

## Context

graphql 17 is the latest release. Apollo Server 5, which the gateway runs on, accepts only graphql 16.

## Decision

`graphql` is pinned to **16.14** across the repository, through the pnpm catalog.

## Consequences

- One copy of `graphql` in the gateway's tree; two copies would break `instanceof` checks between libraries.
- Features new in 17, such as incremental delivery with `@defer` and `@stream`, wait for Apollo Server to support it.

## Alternatives considered

- **graphql 17 with Apollo Server overridden:** an unsupported combination in the one process that must not fail.
