# 13. The works come from The Met

- Status: accepted
- Date: 2026-10-05

## Context

A print shop of public-domain works needs images that may be sold, at a resolution worth printing, from a source that does not block a script.

## Decision

- The works come from **The Metropolitan Museum of Art's** collection API. It flags `isPublicDomain`, and its Open Access images are **CC0** and download without a block.
- The **Art Institute of Chicago** was rejected: its data API answers, but its IIIF images sit behind a Cloudflare challenge for automated clients (403 to curl and to Playwright, tested on 5 October 2026).
- The API gives no image dimensions, so they are **read from the image file's header**.
- A script downloads and reduces the curated works **once**. Its output ships **inside the published images**, so whoever runs Deckle depends neither on the museum nor on downloading hundreds of megabytes.
- How the API really behaves is in [docs/upstream-api.md](../upstream-api.md), probed live.

## Consequences

- The shop works offline from The Met, and a run never hits the museum's servers.
- The data set is a snapshot; refreshing it is a deliberate re-run of the importer, reviewed as a diff.
- The repository carries the reduced images, so their size is budgeted.

## Alternatives considered

- **Fetching from The Met at runtime:** always current, and every visitor's run depends on the museum and its rate limit.
- **The Art Institute of Chicago:** a fine API, with images a script cannot reach.
