# 8. Apollo only where the page is interactive

- Status: accepted
- Date: 2026-10-05

## Context

The store is a Next.js 16 app with Cache Components. Most of a page is data rendered on the server; only the cart, the drop and the live count are interactive. Apollo Client brings a normalised cache, which a Server Component has no use for. The package that bridges Apollo and Next's App Router, `@apollo/client-integration-nextjs`, has had no release since April and has an open bug on Next 16 (issue #553).

## Decision

- **Server Components** read the gateway with a typed `fetch` over a `TypedDocumentNode`, inside `'use cache'` with `cacheTag`, so each response is tagged for invalidation (see [0012](0012-a-cache-that-does-not-lie.md)).
- **Apollo Client 4** runs only in the interactive Client Components: the cart, the drop and the live count over a subscription. Its hooks come from `@apollo/client/react`, its `HttpLink` is explicit, errors are told apart with `CombinedGraphQLErrors.is()`, and there is no `onCompleted`.
- `@apollo/client-integration-nextjs` is left out.
- Types come from **GraphQL Codegen** in the format Apollo recommends: `typescript-operations`, without the client preset.

## Consequences

- Server-rendered data is cached and invalidated by Next itself, by tag, with no client cache to keep in step.
- Two ways to read the API, each where it fits, with the same generated types.
- No hydration of an Apollo cache from the server; an interactive island fetches what it needs itself.

## Alternatives considered

- **Apollo everywhere through the integration package:** one way to read data, built on a package without releases and with a known bug on this Next version.
