# 42. The store renders on the server, from tagged reads of the gateway

- Status: accepted
- Date: 2026-10-06
- Versions: Next.js 16.3.8, React 19.3.0, styled-components 6.6.0-prerelease-20260925231434, @graphql-codegen/cli 7.4.4 with typescript-operations 6.1.10 and typed-document-node 7.1.1, zod 4.6.5
- Scope: `apps/store`, `packages/cache-tags`, `services/gateway/src/graphql/armor.ts`, `compose.yaml`, `infra/caddy/Caddyfile`

## Context

[0008](0008-no-apollo-in-server-components.md) and [0012](0012-a-cache-that-does-not-lie.md) set the direction: Server Components read the gateway with a typed `fetch` inside `'use cache'`, and the gateway drops cache tags when commerce or the CMS reports a change. The first two pages, the front page and a work's page, raised what those records left open:

- The image is built with no gateway to ask: CI's verify job builds with no stack, and the Dockerfile builds before compose starts anything. A page that read at build time could not be built.
- The gateway answers in part when a service is down. With the CMS down, a work comes back with its price and sizes and a null story, with an error beside it. Cached for an hour, the hole would stay for an hour after the CMS returned.
- The tag vocabulary lived as string templates in the gateway. The store tags its reads with the same words, and its revalidation route has to refuse any other.
- A visitor's theme has to apply before the first paint, on pages that are served from a cache.

## Decision

- **Every read lives in one module**, `src/gateway/reads.ts`. Each is a `'use cache'` function that tags its result and asks the gateway through `requestGateway`. Lint forbids pages and components to import the request itself, so no read escapes the tags.
- **The types come from the gateway's committed schema.** GraphQL Codegen runs `typescript-operations` and `typed-document-node` in string mode: each document is the operation's text, typed with its result and variables, so the server sends it as it is, with nothing to parse or print. The output is committed, and `schema:check` regenerates it in CI, so a change to the gateway that breaks the store fails in the same push.
- **Zod checks the envelope, not the data.** The gateway executes every operation against the schema the types come from, so `data` has the fields and the nulls the types say. Zod checks what the gateway does not promise: that the answer is GraphQL at all, and whether it carries errors.
- **Answers are cached by tag, with a timer only as a backstop.** In the `gateway` profile, the browser's router reuses a page for 30 seconds before it asks again, the server renders an answer again in the background once it is an hour old, and a visitor waits for a fresh one only after a day without visits. The webhooks drop a tag the moment the data changes; the hour covers a webhook lost for good. An answer with errors in it is cached for seconds only (`'seconds'`), so a service that was down is asked again on the next visit.
- **Nothing reads at build time.** The front page calls `connection()` before it reads, and a work's page awaits its `params` inside a Suspense boundary. The build prerenders the shell of both (Partial Prerendering), and the reads happen on the first request, then come from the cache. There is no `generateStaticParams`.
- **The tag vocabulary is a package**, `@deckle/cache-tags`: `catalog`, then `artwork:`, `price:`, `stock:`, `collection:`, `story:`, `curation:` and `drop-page:` followed by a slug, with `workTags(slug)` for everything a work's page reads. `isCacheTag` checks the pattern and the length. The gateway builds its tags with it, and the store tags its reads with it and refuses any other tag.
- **The gateway calls `POST /api/revalidate` on Docker's network** with a bearer secret, compared in constant time, and a body of `{ tags, profile }`. Price and stock expire at once (`{ expire: 0 }`); editorial content is served stale while it renders again (`'max'`). Caddy answers 404 on that path, so it does not exist from outside.
- **The theme is kept in `localStorage`**, and an inline script in the head applies it before the first paint. `<html>` has `suppressHydrationWarning`, since the script sets `data-theme` before React hydrates. Without a choice, the tokens follow the system's.
- **styled-components gets `stylisPluginRSC` twice**: through a `StyleSheetManager` in the root layout, which reaches Server Components, and in the client registry. A component's class name is then the same wherever it renders.
- **The gateway's depth limit counts fields, not fragments.** graphql-armor counted each fragment as a level of its own, so the work page's query, five fields down, measured eight once its shapes were written as fragments. With `flattenFragments: true` the limit measures the fields an operation selects, and stays at seven ([0027](0027-gateway-graphql-request-limits.md)).

## Consequences

- The store builds without a stack, in CI and in its image.
- The first visit after a deploy, or after a tag is dropped, waits on the gateway. Later visits are served from the cache.
- A new price shows on the first request after the gateway's call, which the end-to-end test sees within seconds of the change. A CMS edit is served stale once while the page renders again.
- The cache lives in the store's process, and the gateway's call reaches one container. The store therefore runs as one replica; more would need a shared cache handler, or a call to each.
- A visitor with a dark theme chosen gets one script before the first paint, and the server never knows the theme.
- The Apollo islands of [0008](0008-no-apollo-in-server-components.md) take parsed documents, not text. When the cart arrives they get their own Codegen output.

## Rejected

- **`generateStaticParams` for the 48 works**: the build would need a running stack, and every prerendered page would still wait for its tags.
- **Zod schemas for every field of `data`**: a second copy of the gateway's schema to keep in step, checking what GraphQL's execution already guarantees.
- **A theme cookie**: the server could render the right theme, but every page would read a cookie and render at request time, without its cached shell.
- **An HMAC signature on the revalidation call**, as on the webhooks: those cross from other services and carry events. This call stays on Docker's network, carries only tag names, and a replay only renders a page again.
- **Codegen's client preset**: a `graphql()` function and a map of every document, for a server that only needs each operation's typed text.
- **A depth limit raised to eight**: it would pass the store's query by allowing a level of fields no query needs.
