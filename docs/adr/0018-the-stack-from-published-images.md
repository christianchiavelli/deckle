# 18. The stack runs from published images

- Status: accepted
- Date: 2026-10-05

## Context

Whoever clones Deckle should see it running quickly, without a toolchain and without building three Node applications first.

## Decision

- CI publishes the **commerce, cms and gateway images to GHCR** on every push to `main`, tagged `latest` and `sha-<commit>`, with signed build provenance.
- `compose.yaml` names those images **and** how to build them, so `docker compose up --wait` pulls, and `docker compose build` builds from the checkout. `DECKLE_TAG` picks a build.
- Every long-running service has a **healthcheck**, and start-up order follows health, not just start: the seed finishes before Vendure serves, and Caddy waits for the gateway and Vendure.
- Host ports are published on the **loopback interface only**.
- Secrets have **local-only defaults in compose**, never in code: each service refuses to start without its values, and a `.env` file overrides them.
- **Two gateway replicas** are one variable away, `GATEWAY_REPLICAS=2`, and Caddy load-balances them through Docker's DNS.

## Consequences

- A visitor needs Docker and nothing else.
- The published images are the tested ones: the stack job of CI runs the same compose file against them.
- Local defaults for secrets are convenient and must never be mistaken for a production setup; the compose file and `.env.example` say so.

## Alternatives considered

- **Build on first run:** no registry needed, and several minutes of compiling before anything shows.
