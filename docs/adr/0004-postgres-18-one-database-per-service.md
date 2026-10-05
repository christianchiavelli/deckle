# 4. Postgres 18, one database per service, no Redis

- Status: accepted
- Date: 2026-10-05

## Context

Vendure, Payload and the gateway each need a database. Vendure also needs a job queue, and the gateway needs publish and subscribe across its replicas for live updates. Each extra server is one more thing to run, secure and explain.

## Decision

- One **Postgres 18** instance, with **one database and one role per service** (`commerce`, `cms`, `gateway`). A role owns its database and may not connect to the others.
- Vendure's **job queue** runs on its database (`DefaultJobQueuePlugin`), and the gateway's **pub/sub** runs on Postgres `LISTEN`/`NOTIFY`. No Redis.

## Consequences

- One server to run; a bug in one service cannot read or change another's data.
- `LISTEN`/`NOTIFY` payloads are limited to 8000 bytes, so events carry identifiers, not documents, and it needs a dedicated connection per subscriber process.
- A database-backed queue polls, which costs a little latency and load; fine at this scale.
- Vendure is tested on Postgres 16. If 18 breaks anything, **16 is plan B**, recorded in a new decision with the evidence.

## Alternatives considered

- **A database per service in separate servers:** closer to production isolation, three times the containers on a laptop.
- **Redis** for the queue and pub/sub: faster, and one more server for a load Postgres handles.
