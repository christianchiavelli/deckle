# 16. Node 24 LTS and pnpm 12, pinned

- Status: accepted
- Date: 2026-10-05

## Context

A monorepo runs the same scripts on every laptop and in CI, and gets different results when the runtime differs. Node 26 becomes LTS only on 28 October 2026, and Vendure does not test on it yet.

## Decision

- **Node 24 LTS**, pinned to **24.21.0** in `package.json` under `devEngines`, which pnpm downloads on the first install.
- **pnpm 12**, pinned to **12.9.1** with its hash in `packageManager`.
- The Docker images build from `node:24.21.0-alpine3.24`, pinned by digest.

## Consequences

- The machine's own Node does not matter: scripts run on the pinned one when started through pnpm.
- pnpm's defaults since 11 protect the install: a version reaches the repository only a day after it is published, and dependency build scripts run only when listed in `allowBuilds`. Versions released the day the repository started are listed as exceptions, version by version.
- Moving to Node 26 is a decision of its own, once it is LTS and Vendure tests on it.

## Alternatives considered

- **Node 26:** newer, not yet LTS, and untested by Vendure.
- **A version manager file** such as `.nvmrc`: needs a tool on every machine, where pnpm already does the job.
