# 15. Local only

- Status: accepted
- Date: 2026-10-05

## Context

Deckle is a portfolio piece. A deployment costs money every month and goes stale; a reviewer who wants to try it can run it.

## Decision

- **No cloud deployment and no monthly cost.** One `docker compose up` runs everything, with no account and no key.
- **AWS and Shopify Plus are left out.** The role lists them as a plus, not a requirement. The README says how Deckle would map onto them: the gateway's commerce adapter is the seam for Shopify Plus, and each container maps to a managed service.

## Consequences

- Anyone can run the whole system, and it does not rot behind an expired bill.
- The README has to sell the project with screenshots, since many readers will not clone it.
- Nothing proves the stack on a cloud provider.

## Alternatives considered

- **A hosted demo:** easier to look at, and a standing cost for something that changes rarely.
