# 3. Vendure 3.7.4, pinned exactly, plugins in the 3.8 shape

- Status: accepted
- Date: 2026-10-05

## Context

Vendure 3.8 exists only as nightly builds, with no release date. 3.7.4 was released on 5 October 2026 and fixes overselling in concurrent checkouts, which matters to a shop that sells numbered copies.

## Decision

- `@vendure/*` is pinned to **3.7.4 exactly**, in the pnpm catalog.
- Deckle's plugins are written in the **3.8 shape** now: compiled with `module: nodenext`, tested with Vitest, and never dependent on the order of `onModuleInit` across plugins.
- The gateway treats an **HTTP 400** from Vendure that carries GraphQL errors as GraphQL errors, since 3.8 answers that way.
- The **Admin API** is used only with an **API key** (available since 3.6), never a customer's session.
- The anonymous **telemetry** Vendure turns on by default since 3.6 is **off**: `VENDURE_DISABLE_TELEMETRY=true`.
- The admin is the **React Dashboard**: the Angular admin stopped being maintained in July 2026.
- When 3.8.0 ships, the upgrade follows the checklist in Vendure's PR #5386, database migration included.

## Consequences

- Upgrading to 3.8 should be a version bump, a migration and a test run, not a port of every plugin.
- An exact pin means no patch release arrives by accident; each one is taken on purpose.
- Vendure 3.7 runs on NestJS 11 and Apollo Server 4 inside its own package, while the gateway is on NestJS 12 and Apollo Server 5. The two never share a process.
- Vendure is licensed under GPL-3.0, with a commercial licence on offer. Deckle's own code is MIT. The commerce image combines both; every line of Deckle's part is public here and MIT is compatible with the GPL, so publishing the image offers the source the GPL asks for. A shop keeping its plugins private would have to look at the commercial licence.

## Alternatives considered

- **A 3.8 nightly:** the newest shape, but no release to pin and no date for one.
- **`^3.7.0`:** would follow patch releases automatically, which is how an unreviewed change reaches a checkout.
