# Catalogue hooks: coalesced in memory, delivered through Vendure's job queue

- Status: accepted
- Date: 2026-10-05
- Scope: `services/commerce/src/plugins/catalogue-hooks`

## Context

The gateway caches what the store shows and expires it by tag when commerce says something changed (`POST /hooks/commerce`, signed with `Deckle-Signature`, at least once, idempotent by `id`). One admin save emits several Vendure events within milliseconds; the seed emits thousands. Some events lack what the hook needs: an updated price arrives without its variant, a stock movement's variant is often a bare id, and a deleted collection's row is gone by the time anyone asks for its slug.

## Decision

1. **Listen** to product, variant, price, stock, collection and asset events in every process (the server sees admin edits, the worker sees collection filters applied, the seed sees its own writes), and keep what each says changed in a buffer.
2. **Batch** on one second of quiet, or five seconds after the first change, whichever comes first.
3. **Resolve** what the events left out in a handful of queries per batch: prices to variants, variants to products, products and collections to slugs. Soft-deleted rows still resolve; a deleted collection's slug comes from the event itself.
4. **Coalesce**: one notification per entity and type, the latest slug, the strongest action (deleted over created over updated), variant ids merged, and nothing about the variants, prices or stock of a product created or deleted in the same batch.
5. **Enqueue** one job per notification with a fresh UUID (`id`) in `deckle-catalogue-hooks`; only the worker delivers.
6. **Deliver** with a five-second timeout, no redirects, and a signature made per attempt, so a late retry still falls inside the receiver's five-minute window. A 2xx is done; 400, 410, 413 and 422 are logged and dropped, since the same bytes would be refused again; anything else, or no answer, is retried 12 times with exponential backoff from about 2 s to 5 minutes (some 40 minutes in all). Vendure's SQL queue asks for the delay on every poll, so its jitter comes from a hash of the job id: one job always waits the same time, and a burst of jobs still spreads out.

On shutdown the plugin stops listening and hands the buffer to the queue before the database closes; the seed drains it before it exits.

## Consequences

- The seed's thousands of events become about one notification per work and collection.
- The store learns of a change one to five seconds late, plus up to half a second of queue polling.
- A process killed outright (no SIGTERM) loses up to five seconds of buffered changes; the gateway serves those pages stale until the next change to them.

## Rejected

- A job per event: thousands of hooks for one seed run, most of them redundant.
- Sending from the event handler: no retries, and a slow gateway would hold up the process that made the change.
- A transactional outbox: Vendure publishes events after the commit and gives plugins no hook inside its transactions; the window it would close is the five-second buffer.
