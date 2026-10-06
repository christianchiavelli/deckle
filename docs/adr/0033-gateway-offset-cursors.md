# 33. Offset cursors over commerce's skip and take

- Status: accepted
- Date: 2026-10-05
- Versions: Vendure 3.7.4 (Shop API), @nestjs/graphql 14.0.3

## Context

`artworks(first, after, filter)` and `Collection.artworks` are cursor connections, so clients page with opaque cursors. Commerce's Shop API pages `products` and `search` only with `skip` and `take`, and has no way to ask for the products after a given one in a stable sort.

## Decision

- A cursor is the base64url of `artwork:v1:<offset>`. Decoding checks the prefix and accepts an offset of at most 100,000. Anything else is a `BAD_USER_INPUT`, never a guess.
- `first` defaults to 24 and is capped at 48. `hasNextPage` comes from commerce's `totalItems`.
- Both lists sort by name. The collection filter asks commerce's search for the product ids on the page, then reads those products by id and keeps the order search gave.

## Consequences

- When a work is added or removed between two page requests, the next page can repeat or skip one item. The catalogue holds about 48 works and changes rarely, so that is accepted.
- The `v1` in the cursor lets a keyset cursor replace this one later, without clients changing, since they never read cursors.
- The collection filter depends on commerce's search index (Vendure's `DefaultSearchPlugin`) being built.

## Rejected

- **Keyset pagination now**: commerce would need a custom query (a plugin) for "after this name and id", which is more machinery than a 48-work catalogue needs.
- **Page numbers**: clients would rebuild pagination themselves, and the connection shape is what the store's data layer expects.
