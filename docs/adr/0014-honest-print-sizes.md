# 14. Only the sizes a scan can hold

- Status: accepted
- Date: 2026-10-05

## Context

Print shops routinely sell a large print of a small scan, upscaled. The customer finds out when it arrives. Deckle's data comes with every scan's real pixel size, so it can do better.

## Decision

- A size is sold only if the scan holds it at **240 ppi or more**, worked out from the original's pixels. Nothing is upscaled.
- Every size is still **listed**, with its resolution, so the store can say why one is not for sale.
- A value the source does not have shows as a **dash, never a zero**.
- 240 ppi is the proposed floor: fine line work stays sharp at arm's length. It is written down here so it can be argued with; changing it is one constant in `@deckle/print-sizes`.

## Consequences

- Some works print at A4 only. That is the honest answer, and the store shows it.
- The rule lives in one plain TypeScript package used by the importer, the seed and the gateway, so it cannot drift between them.

## Alternatives considered

- **300 ppi:** the usual figure for photographs viewed up close; it would leave many works at A4.
- **Upscaling:** more sizes to sell, at a quality the customer cannot see until it is too late.
