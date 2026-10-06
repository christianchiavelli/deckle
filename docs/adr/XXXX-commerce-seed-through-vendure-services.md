# The commerce seed goes through Vendure's services, not populate() and a CSV

- Status: accepted
- Date: 2026-10-05
- Scope: `services/commerce/src/seed`

## Context

The shop is built from `data/met` (five works today, about 48 once the importer's curated set lands): one product per work with its museum record as custom fields, one variant per paper size its original scan prints at 240 ppi, facets and collections, plus the shop's own setup (USD, one zone, 0 % tax included in prices, flat shipping, a dummy payment method) and the gateway's API key. The seed runs as a one-shot container on every `docker compose up`, so it must be safe to run again.

## Decision

A programmatic seed in a Vendure worker context, through `ProductService`, `ProductVariantService`, `FacetService`, `CollectionService`, `AssetService` and friends.

- **Idempotent by the museum's id.** A work whose `metObjectId` is already on a product, soft-deleted ones included, is skipped, so an admin's deletion is not undone. Each step of the shop setup reports created, updated or unchanged.
- **One transaction per work**: the image, the product, its options and its variants commit together, so a failure never leaves a product without variants that the next run would skip as done.
- **Sizes from the original scan** through `@deckle/print-sizes`; a work that cannot print an A4 is logged and left out. SKUs are `<objectId>-<size>`, prices A4 5500, A3 9000, A2 14000, A1 21000 cents, inventory not tracked (open editions are printed to order).
- **Images** are the masters named in `catalog.json`, JPEG or WebP, with the media type taken from the extension and stated to Vendure, which also checks the file's own bytes.
- **Facets** for artist, technique, century, department and edition; collections are facet filters: all prints (open edition), then one per technique and per century.
- **Migrations first**, behind the same advisory lock as the server, so the seed can run before it.

## Consequences

- More code than a CSV, tied to the service APIs, which may move in Vendure 3.8.
- Custom fields are set with their types (integers, lists, nulls) instead of strings a CSV would need parsed back.
- A second run is a no-op in about a second.

## Rejected

- `populate()` with `initialData` and a products CSV: made for an empty database (not idempotent), and the CSV would be a second rendering of `catalog.json` to keep in step, custom fields included.
- Seeding over the Admin API: the same service calls behind a network hop and an administrator session.
