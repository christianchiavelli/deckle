# 29. Idempotent webhooks in one transaction

- Status: accepted
- Date: 2026-10-05
- Versions: drizzle-orm 0.45.3, pg 8.23.1, Postgres 18.6, NestJS 12.1.2

## Context

Commerce and the CMS deliver `POST /hooks/commerce` and `POST /hooks/cms` at least once, retrying from their own queues, and a retry may reach a different replica. Each delivery has to revalidate the store's cache tags and announce `artworkChanged` once, and an event must not be lost when the store is down.

## Decision

- The signature is checked on the raw body before anything is parsed: HMAC-SHA256 of `<t>.<raw body>`, at most 300 s off the gateway's clock in either direction, compared in constant time, with several `v1` values accepted so a secret can rotate. A bad signature gets a 401, and a body that fails its Zod schema gets a 400.
- The delivery id is claimed and the work is done in one transaction. The claim is `insert into webhook_deliveries ... on conflict do nothing returning id`, and the work is the store revalidation followed by `pg_notify`, published through the same transaction:
  - When the work fails, the transaction rolls back and the claim with it. The gateway answers 503 and the sender's retry does the work.
  - A concurrent duplicate waits on the primary key until the first transaction ends. If the first committed, it skips the work; if it rolled back, the duplicate does the work.
  - Both answer 204, so the sender stops.
- Claims are kept for 7 days, longer than any sender retries. Every replica purges older rows hourly, which is idempotent.
- Without `STORE_REVALIDATE_URL`, until the store exists, revalidation is logged and skipped, and deduplication and the live event still happen.

## Consequences

- The transaction stays open while the store is called, for up to its 5 s timeout, and holds one pooled connection for that time. That is acceptable at webhook rates, and it is what makes "done once, or not at all" hold.
- A crash after the store answered but before the commit makes the retry revalidate again. Revalidation is idempotent, so that is harmless.
- The integration suite covers redelivery, a concurrent duplicate blocked on the row with either outcome of the first delivery, and two replicas receiving the same delivery.

## Rejected

- **Claiming in one step and working in another**: a failure between the two loses the event for good.
- **An in-memory set of recent ids**: it is per replica and forgotten on restart.
- **Redis `SET NX`**: there is no Redis, and it would split the claim from the NOTIFY's transaction.
