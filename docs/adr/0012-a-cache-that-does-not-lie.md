# 12. A cache that does not lie

- Status: accepted
- Date: 2026-10-05

## Context

The store caches what it renders. A cached price or stock level that is out of date is a wrong answer; a cached paragraph that is a minute old is not.

## Decision

- Vendure and Payload **notify the gateway** with signed webhooks, and the gateway **invalidates the store's Next.js cache tags**.
- **Price and stock expire at once:** `revalidateTag(tag, { expire: 0 })`.
- **Editorial text** keeps being served while it revalidates: `revalidateTag(tag, 'max')`.
- A Server Action that changes something calls **`updateTag`**, so whoever made the change sees it at once.

## Consequences

- Pages are served from cache and are still right about what matters.
- The webhooks must be delivered at least once and handled idempotently; a lost one would leave a stale page until the next change.
- One tag vocabulary is shared by the gateway and the store, and is part of the contract.

## Alternatives considered

- **Time-based revalidation:** simple, and wrong about prices for the length of the timer.
- **No caching of commerce data:** always right, and every page waits on Vendure.
