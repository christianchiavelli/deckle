# 50. Each visitor's data is read in the browser

- Status: accepted
- Date: 2026-10-07
- Versions: Next.js 16.3.8, React 19.3.0, Apollo Client 4.3.2, graphql-ws 6.3.0, @simplewebauthn/browser 14.0.0
- Scope: `apps/store/src/live`, `apps/store/src/app`, `apps/store/codegen.ts`

## Context

Items 4 and 5 give the store a cart, a checkout, an order page, an account, and a drop that can be claimed while its count moves. All of it belongs to one visitor, through the gateway's session cookie (ADR 0046), while the pages around it are the same for everyone and prerendered: a static shell, with cached holes filled from tagged reads of the gateway (ADR 0042). [0008](0008-no-apollo-in-server-components.md) settled that Apollo Client runs only where a page is interactive. It did not settle where a visitor's data is read, nor how the parts of a page that show the same data stay in step.

## Decision

- **What is everyone's renders on the server; what is the visitor's is read in the browser.** The prints, a drop's page and record, the band's stock and the countries stay server reads, cached and tagged. The header's count, the cart, a held copy, an order and the account are `useQuery(..., { ssr: false })`: the server and the hydrating browser render the same waiting state, and the request leaves from the browser, cookie and all, for `/graphql` on the store's own origin, which Caddy hands to the gateway. The store's server never sees a session.
- **One Apollo Client per page load, still without the Next integration.** The provider sits in the root layout. On the server it holds a client that never sends, since Apollo Client 4's `useQuery` does not subscribe there. `@apollo/client-integration-nextjs` stays out, for the reasons in 0008.
- **Type policies let one answer update every reader.** `Cart` has no key fields, so it is a singleton: adding a print updates the header's count and the cart page from the mutation's answer, without a refetch. `Drop` is keyed by slug, and its `stock` is replaced whole, never merged. `DropCopy` is keyed by its drop, since an account holds one copy of each. `PlacedOrder` is keyed by code and `Query.order` reads through to it, so the confirmation shows the order checkout just got back without asking again.
- **The live count is a graphql-ws subscription on the same origin.** A split link sends subscriptions over a WebSocket to `/graphql` and everything else over HTTP. The socket is lazy: it opens with the first subscription, so only a drop page that is open holds one. Each event replaces the drop's stock in the cache.
- **Time is the server's until hydration, then the browser's.** A countdown starts from the time the page was rendered with, as the server snapshot of `useSyncExternalStore`, so the HTML and the first render in the browser agree. A hold's deadline is the moment this browser first read it plus the `secondsLeft` the gateway counted by the database's clock, so a browser whose clock is off still shows the ten minutes the database will honour.
- **Passkeys go through `@simplewebauthn/browser`.** The options the gateway sends are checked with `zod/mini` before the ceremony starts. Once it ends, every active query is fetched again, so the page turns into the signed-in one without a reload; signing out resets the cache, so nothing of the account stays in memory.
- **A layer the linter enforces.** Apollo Client, graphql-ws and SimpleWebAuthn can only be imported under `src/live`, and `src/live` cannot import the server's reads or its environment. Its operations live in `src/live/operations`, typed by a second codegen output that keeps documents as syntax trees, as Apollo takes them, and types every `__typename`, so the keys a type policy reads are checked.

## Consequences

- Every page keeps its static shell and its cached holes; a visitor with a cart costs the store's server nothing more than one without.
- The header's count, the cart and the account appear one round trip after the page. Until then the page shows its heading, marked busy, and the footer waits with it ([0051](0051-a-page-holds-still-as-it-streams-in.md)).
- The store reads the gateway two ways, each with its own generated types: a typed `fetch` for what is shared, Apollo Client for what is the visitor's. The gateway's complexity spec prices the operations of both.
- The drop and passkey checks need the whole stack behind Caddy, on port 8080; the e2e suite makes its passkeys with Playwright's virtual authenticator.
- Without JavaScript, the shared pages still read in full, but nothing goes in a cart.

## Rejected

- **Reading the visitor's data on the server, with the cookie passed on**: every page with the header would turn dynamic and lose its static shell, and the store's server would handle every session.
- **Server Actions for the changes**: the cookie would make a round trip through the store's server, and the answers would not land in the client cache the header and the cart page share.
- **A refetch after each change instead of type policies**: a second request for what the change already returned, and a moment where the header and the page disagree.
- **Polling for the live count**: the gateway already pushes each change over graphql-ws (ADR 0028), within 150 ms of a claim.
