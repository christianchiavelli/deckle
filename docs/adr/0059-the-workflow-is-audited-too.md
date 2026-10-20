# 59. The workflow is audited too

- Status: accepted, extending [ADR 0019](0019-ci-least-privilege-pinned-actions.md)
- Date: 2026-10-20
- Versions: actionlint 1.7.12 (its image, with shellcheck 0.11), zizmor 1.31.1
- Scope: `.github/workflows/ci.yml`

## Context

ADR 0019 keeps the workflow's token read-only, widened only for the job that publishes images, and pins every action to a commit. Nothing checked that the workflow kept to it: a new job could check out the code with the token saved in `.git`, an expression could put an untrusted value into a script, or a pin could name a commit that is not in the action's repository at all, which runs a stranger's code under the action's name. The publishing job holds a token that can write packages and sign provenance, which makes either mistake worth more here than in a workflow that only reads.

## Decision

- **A `workflows` job, first in the file**, lints and audits `.github/workflows` on every push and pull request.
- **actionlint** checks the workflow itself: its syntax, its expressions and the job graph, and every `run` script through shellcheck. It runs from its image, pinned by digest, so no Go toolchain is set up for it.
- **zizmor** audits it for security: template injection, excessive permissions, credentials persisted by a checkout, and, with the job's read-only token, actions pinned to impostor commits or to versions with a known advisory. It runs from PyPI at a pinned version, through the runner's `pipx`.
- **No checkout persists the token.** zizmor found all six keeping it in `.git`, where a later step, or an artifact uploaded from the workspace, could read it; each now sets `persist-credentials: false`.

## Consequences

- A workflow change that weakens ADR 0019 fails its own push.
- The tools are pinned like everything else, and updated by hand.

## Alternatives considered

- **GitHub's code scanning with zizmor's SARIF:** the findings as alerts in the Security tab, for a token that can write security events, which no job here needs otherwise.
- **A pre-commit hook:** checks a laptop that has the tools, not every push.
