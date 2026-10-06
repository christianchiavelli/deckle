# 27. Gateway GraphQL request limits

- Status: accepted
- Date: 2026-10-05
- Versions: @apollo/server 5.5.1, @escape.tech/graphql-armor 3.2.0, graphql-query-complexity 2.0.0, graphql-ws 6.3.0, graphql 16.14.2

## Context

`/graphql` is public through Caddy, over HTTP and WebSocket, and one operation can fan out into many calls to commerce and the CMS. A depth limit alone does not stop an operation that is shallow but wide, such as 48 artworks, each with its story and its sizes.

## Decision

- **Parse**: Apollo's `parseOptions.maxTokens` is 2000, enforced by graphql-js's parser, so an oversized document gets a 400. graphql-armor's own token limit is off, because its plugin throws in `parsingDidStart`, which Apollo Server 5 turns into a 500.
- **Validate**: graphql-armor sets the shape limits. Depth is capped at 7 (the deepest store page needs 6), aliases at 15 and directives at 10. Field suggestions are hidden in production, so error messages do not leak the schema.
- **Price**: graphql-query-complexity uses estimators declared on the fields. A list counts as its page size (`first`, capped at 48, default 24) times its children. A field that calls another service adds 10. The maximum is 2500. The heaviest real pages cost 455 to 913, while the fan-outs the limit exists for cost 11,561 to 74,601. graphql-armor's cost limit is off, because it prices every field the same and ignores list sizes.
- **Transport**: batched HTTP requests are refused. Apollo's automatic persisted queries are off, so a client cannot fill a server cache with arbitrary documents. Introspection and GraphiQL exist only outside production, and stack traces never leave the process in production.
- **CSRF**: Apollo's `csrfPrevention` stays on, and Nest's Fetch-Metadata CSRF guard trusts only `PUBLIC_ORIGIN`.
- **WebSocket**: graphql-ws runs neither Apollo's plugins nor its validation rules, so a guard in `onSubscribe` repeats all three steps: it parses with the same token limit, validates with the same rules, and prices the operation with the same maximum. `onConnect` closes the socket with 4403 when the `Origin` is another site's, because browsers do not apply CORS to WebSockets.

## Consequences

- The limits come from estimates, so they hold however the data grows. The trade-off is that a query near the limit may be refused even if the real lists are short.
- The numbers should be recalibrated once the store's real queries exist. A persisted-query allowlist built from the store would then replace most of this for first-party traffic.

## Rejected

- **A depth limit alone**: it does nothing against width.
- **graphql-armor's cost limit**: it has no list multipliers.
- **Timeouts as the only guard**: by the time one fires, the fan-out has already been sent upstream.
