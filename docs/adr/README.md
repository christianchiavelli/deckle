# Decision records

One file per decision that had a trade-off, version pins included. Each says what was decided, why, what it costs, and what was turned down. A record is never edited to change its decision: a new one supersedes it and says so.

| # | Decision |
| --- | --- |
| [0001](0001-buy-the-platforms-build-the-drop.md) | Buy the platforms, build only the drop |
| [0002](0002-one-origin-through-caddy.md) | One origin for the browser, through Caddy |
| [0003](0003-vendure-3-7-4-pinned.md) | Vendure 3.7.4, pinned exactly, plugins in the 3.8 shape |
| [0004](0004-postgres-18-one-database-per-service.md) | Postgres 18, one database per service, no Redis |
| [0005](0005-typescript-6-0.md) | TypeScript 6.0 across the monorepo |
| [0006](0006-graphql-16.md) | graphql 16 |
| [0007](0007-styled-components-prerelease.md) | A styled-components prerelease |
| [0008](0008-no-apollo-in-server-components.md) | Apollo only where the page is interactive |
| [0009](0009-drizzle-before-1-0.md) | Drizzle 0.45, without the relational query API |
| [0010](0010-first-come-first-served-drops.md) | Drops are first come, first served, locked in the database |
| [0011](0011-passkeys-in-the-gateway.md) | Passkeys in the gateway |
| [0012](0012-a-cache-that-does-not-lie.md) | A cache that does not lie |
| [0013](0013-data-from-the-met.md) | The works come from The Met |
| [0014](0014-honest-print-sizes.md) | Only the sizes a scan can hold |
| [0015](0015-local-only.md) | Local only |
| [0016](0016-node-24-and-pnpm-12-pinned.md) | Node 24 LTS and pnpm 12, pinned |
| [0017](0017-design-system-starts-in-code.md) | The design system starts in code |
| [0018](0018-the-stack-from-published-images.md) | The stack runs from published images |
| [0019](0019-ci-least-privilege-pinned-actions.md) | CI with least privilege and pinned actions |
| [0020](0020-pace-requests-to-the-met.md) | One request a second to The Met, retried with jitter |
| [0021](0021-reduced-masters.md) | Reduced masters: WebP, 2,400 px, quality 60 |
| [0022](0022-a-repeatable-import.md) | An import that changes nothing when nothing changed |
| [0023](0023-cms-migrations-at-start-up-and-a-rest-seed.md) | CMS: migrations at start-up, and a seed that talks REST |
| [0024](0024-cms-webhooks-through-the-jobs-queue.md) | CMS: webhooks to the gateway through Payload's jobs queue |
| [0025](0025-cms-content-model-and-gateway-access.md) | CMS: a small rich-text contract, and a read-only gateway |
