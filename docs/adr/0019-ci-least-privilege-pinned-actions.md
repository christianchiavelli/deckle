# 19. CI with least privilege and pinned actions

- Status: accepted
- Date: 2026-10-05

## Context

A workflow runs third-party code with a token that can write to the repository and its packages. A tag on an action can be moved to point at different code.

## Decision

- The workflow's token can only **read** the repository. The job that publishes images widens it for itself alone, to write packages and sign provenance.
- **Every action is pinned to a full commit SHA**, with the version in a comment.
- Every push to `main` runs, in order of what they can see: **verify** (format, lint, types, unit tests, build), **integration** (Testcontainers against Postgres 18), **contract** (the committed GraphQL schema matches the code, and has no breaking change against the commit before it), then **images** and the **stack** started from them through the front door.
- The schema is compared with the **previous commit** on a push, since changes go straight to `main`, and with the base on a pull request.

## Consequences

- A compromised or moved tag cannot change what runs.
- Pinned SHAs go stale; updating them is a deliberate change. Dependabot is not used, since it works through pull requests and this repository does not.
- A breaking schema change fails the push that makes it, after the fact: the check is in CI because there is no pull request to stop it at.

## Alternatives considered

- **Actions by major tag:** less upkeep, and trust in whoever can move the tag.
