# CMS: webhooks to the gateway through Payload's jobs queue

- Status: accepted
- Date: 2026-10-05
- Versions: Payload 3.90.2 (`@payloadcms/db-postgres`), Postgres 18

## Context

The gateway caches what the store shows and needs to hear when published content changes: a story, a curation or a drop page published, edited while published, unpublished or deleted. The contract is fixed: a signed JSON `POST` to `/hooks/cms` with one `id` per event, delivered at least once, the receiver dropping duplicates by `id`. An editor's save must not wait for the gateway, and a draft autosave, which happens every second while someone types, must send nothing.

Payload gives an `afterChange` hook no flag that says "this was a draft save". Its `doc` and `previousDoc` describe the latest version, which may be a draft, so "previous published, now draft" reads the same for an unpublish and for the first autosave after a publish.

## Decision

1. **The published row decides.** With drafts on, Payload writes a draft only to the versions table and leaves the collection's own row, the published version, untouched. A `beforeChange` hook reads that row before the write, `afterChange` reads it after (inside the same transaction), and a pure function compares them: nothing published to published is `created`, published to nothing is `deleted`, the same subject rewritten is `updated`, an unchanged `updatedAt` (a draft save) is nothing, and a changed slug is `deleted` at the old address plus `created` at the new. `afterDelete` reports a published row as `deleted`. Restoring a version goes through the same hooks.
2. **Each event is a job, queued in the save's transaction.** `payload.jobs.queue({ req })` writes to `payload-jobs` with the request's transaction, so an event exists if and only if its change commits: an outbox, without a table of its own.
3. **The runner lives in the server.** Payload recommends its `jobs:run` bin script for dedicated servers, but the standalone image has no CLI; `jobs.autoRun` is the documented alternative for a long-running server, and runs the `cms-events` queue every five seconds in the Next.js process. It starts with Payload, which starts at boot (see the start-up record).
4. **Retries back off.** The task `deliver-cms-event` throws on anything but a 2xx, network errors and timeouts (10 s) included, and Payload retries it ten times, waiting 2 s, 4 s, 8 s and onwards, about half an hour in all. The body, and so the `id`, never changes; the signature is made at send time, so a late retry is still within the receiver's five minutes. Redirects are not followed. A job that runs out of retries stays in the queue with its error, readable by admins in the admin panel (System › Payload Jobs).
5. **No delivery is lost to a crash.** Payload marks a running job `processing` and never times that out; at start-up, before the runner starts, the CMS hands any of its own deliveries still marked so back to the queue. One process runs the queue, so nothing else can be holding them.
6. **The queue is the admins'.** `jobs.access` (queue, run, cancel) and reading `payload-jobs` are for admins only; Payload's default lets any signed-in user, the gateway's included, run the queue.

## Consequences

- At least once, as the contract says; a crash between the gateway's 204 and the job's completion sends the event again with the same `id`.
- Delivery order is not guaranteed: the runner sends a batch in parallel. Each event stands alone (an invalidation), so order does not matter to the gateway.
- Up to five seconds between a publish and its event; the cache can be that stale.
- Two reads of a primary key per save, autosaves included.

## Alternatives rejected

- **`fetch` in `afterChange`.** Blocks the save on the gateway, or, fired and forgotten, loses the event when the gateway is down; and it runs before the transaction commits, so it can announce a change that rolls back.
- **A separate worker container with `payload jobs:run`.** Needs the full install and sources in an image of its own, for one small task.
- **Telling draft saves apart by `previousDoc._status`.** Reports the first autosave after every publish as an unpublish.
