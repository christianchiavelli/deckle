# Gateway health is readiness

- Status: accepted
- Date: 2026-10-05
- Versions: @nestjs/terminus 12.1.0, NestJS 12.1.2

## Context

Compose needs one signal to order start-up (`depends_on: condition: service_healthy`) and to mark a container unhealthy. The gateway depends hard on Postgres (webhook deduplication, pub/sub, signing keys) and soft on commerce and the CMS, since a page can still render the parts that answered.

## Decision

`GET /health` (Terminus) is a readiness check:

| Check | How | When it fails |
| --- | --- | --- |
| `database` | `select 1`, 1 s timeout | `down`, and the endpoint answers 503 |
| `pubsub` | the LISTEN connection is open | `degraded`, still 200 |
| `commerce` | `GET /health` on the commerce host, 1.5 s timeout, cached 10 s | `degraded`, still 200 |
| `cms` | `GET <CMS_API_URL>/health`, same limits | `degraded`, still 200 |

The image's `HEALTHCHECK` calls it, and it answers `Cache-Control: no-store`.

## Consequences

- An outage of commerce or the CMS does not take the gateway out of service. The fields that need the missing service fail with `UPSTREAM_ERROR`, and the rest of the response still resolves.
- The probes to upstreams are cached, so a busy healthcheck does not hammer them.
- There is no liveness endpoint. A process that cannot work exits (a failed start exits 1, a crash ends the process), and the restart policy handles that. A liveness probe that failed on the database would restart every replica during a database outage, which fixes nothing.

## Rejected

- **Separate `/live` and `/ready`**: nothing here consumes liveness. Terminus makes the split one route away if an orchestrator ever does.
- **Failing on upstreams**: it would turn one service's outage into a gateway outage.
