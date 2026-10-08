# 52. A thousand claims through two gateways

- Status: accepted
- Date: 2026-10-08
- Versions: k6 2.3.0 (`grafana/k6`, pinned by digest), @types/k6 2.3.0
- Scope: `load`, the `load` service in `compose.yaml`, the stack job in CI

## Context

ADR 0049 puts the drop's lock in the database: a row per copy, claims under `FOR UPDATE SKIP LOCKED`, and the rules a person is held to as unique indexes. The integration suite already claims a thousand times at once from two connection pools. What it cannot show is the whole path a browser takes, session and passkey included, through Caddy and two gateway replicas at once. If the lock lived in a gateway's memory, two replicas would each hand out copies of their own. The spec asks for k6, running its TypeScript directly, against two replicas.

## Decision

- **k6 2.3.0 in its own image, as a compose service.** The `load` service sits under a profile, so `up` never starts it, and runs `load/drop.ts` on Docker's network, through Caddy, as a browser would. Docker stays the one thing a clone needs. `pnpm --filter @deckle/load test:load` scales the gateway to two and runs it with `run --no-deps`, because starting the service's dependencies would set the gateway back to one replica.
- **Every person signs up with a passkey, made in software.** `load/support/authenticator.ts` answers the gateway's registration as a phone does: a new P-256 key, attested as "none", with the owner present and verified, written in CBOR by a small encoder of its own. The gateway checks it exactly as it checks a device's answer, so the test needs no door into accounts that the published images would also carry. A unit spec has SimpleWebAuthn, the gateway's own library, verify what it makes.
- **The sign-ups come first, the claims all at once.** Setup makes a thousand accounts, fifty at a time, each with its own cookie jar, and agrees an instant five seconds after it ends. Every person then claims at that instant from a session of its own. A person still signing up at that moment would fail the run, so a slow machine cannot thin out the burst.
- **The database's count is the verdict.** A separate scenario reads the drop's stock once the claims are in and once they are given back: the copies that were open must all be held, none more, none sold; then the drop must stand as it did before the test. Each claim must be answered with a copy or with `NO_COPY_OPEN`, and nothing may fail as HTTP.
- **Thresholds**: every check passes; no claim leaves late, and all of them within one second of the instant; 95% of claims are answered within five seconds. A claim that queued behind other claims' locks would take minutes, not seconds.
- **CI runs it on every push.** The stack job starts two gateways for the browser checks and the load alike, runs the test after the browser checks, and then counts the requests each gateway logged during it: both must have answered.

## Consequences

- On a 20-core machine, with two gateways: 1,000 people, the 38 to 40 copies open each time all held and the rest refused, the claims sent within 0.3 s of each other, and 95% answered within 0.7 to 0.8 s. Each gateway answered half of the 3,000 or so requests. Through one gateway, the 95th percentile was 1.3 s.
- On CI's four-core runner, after the browser checks had sold one copy: the 49 open copies held by 49 people and 951 refused, the claims sent within 0.13 s of each other, 95% answered within 1.6 s, and 1,527 requests on each gateway.
- Each run leaves a thousand accounts in the gateway's database, holding nothing. On a laptop they are invisible; CI starts from an empty stack every time.
- The test needs the drop open and at least one copy open, and says so in setup otherwise. While it runs, anyone watching the drop sees its copies held for ten seconds.
- The browser checks in CI now run across two gateways, which exercises the sessions, the passkey ceremonies and the live count's pub/sub between replicas on every push.

## Rejected

- **A test-only way to mint sessions**: quicker to write, but a way into accounts that production images would carry, behind a flag.
- **Signing up inside each virtual user, just before the claim**: the burst would wait on the slowest sign-up, and on a small CI runner some claims could leave after the instant.
- **k6 installed on the host**: one more tool to install; the image needs nothing.
- **Trusting k6's own counters**: they are per virtual user and per process; the database is where an extra copy would show.
