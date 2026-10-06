# 28. Gateway pub/sub on Postgres LISTEN/NOTIFY

- Status: accepted
- Date: 2026-10-05
- Versions: Postgres 18.6, pg 8.23.1, graphql-ws 6.3.0, @nestjs/graphql 14.0.3

## Context

`Subscription.artworkChanged(slug)` must reach a browser connected to any gateway replica, while the webhook that causes the change lands on one replica only. The stack has Postgres and no Redis, by design.

## Decision

- One channel, `deckle_gateway_events`. Every replica `LISTEN`s once and routes by the `topic` in the payload (`artwork-changed:<slug>`), so a new topic never needs a new `LISTEN`.
- Publishing is `select pg_notify(...)` through the caller's executor. The webhook handler publishes inside its delivery transaction, so Postgres sends the event on commit and never for a delivery that rolled back.
- Receiving needs a connection that stays open, so each replica holds one `pg.Client` of its own (`application_name` `deckle-gateway-listener`), outside the pool. When it drops, it reconnects with jittered exponential backoff from 250 ms up to 15 s, and `/health` reports `pubsub` as degraded in the meantime.
- Payloads are refused before Postgres when they reach 8000 bytes, which is Postgres's limit. Events carry a slug and a kind, and readers fetch the rest.
- Each subscriber has a queue of 64 events. A slow reader loses the oldest event, because each one announces the latest state.

## Consequences

- Delivery is at most once. An event published while a replica is reconnecting never reaches that replica's subscribers, since NOTIFY keeps nothing. A client that reconnects should refetch what it shows rather than trust that it missed nothing.
- Each replica costs one extra Postgres connection.
- Throughput is bounded by Postgres's single notification queue, which is far beyond what catalogue changes need.
- The integration suite proves the cross-replica path against Postgres 18, including commit and rollback, the size limit and a killed listener connection.

## Rejected

- **Redis pub/sub**: another service to run and monitor, for a load Postgres already carries.
- **Polling an events table**: adds latency and constant load, and needs its own cleanup.
- **Third-party Postgres pub/sub packages for GraphQL**: they are old, built for the legacy `subscriptions-transport-ws` protocol, and hide the reconnect behaviour this needs to control.
