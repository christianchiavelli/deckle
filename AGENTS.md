# Deckle

A headless print shop for public-domain works from The Met, with numbered drops that never oversell. `README.md` says what it does and why; this file is how to work on it, for people and for coding agents alike.

## Layout

| Path | What it is |
| --- | --- |
| `apps/cms` | Payload 3 in its own Next.js app: each work's story, curated collections, drop pages, draft preview |
| `services/commerce` | Vendure 3.7.4, server and worker: catalogue, cart, checkout and orders. Only the gateway talks to it |
| `services/gateway` | NestJS 12 GraphQL gateway: one schema over commerce, CMS and drops. Owns identity and drops |
| `packages/met` | The Met's API client, the curated list of works, and the importer that writes `data/met` |
| `packages/print-sizes` | Which paper sizes a scan can print, and at what ppi. Plain TypeScript, no I/O |
| `packages/eslint-config` | The lint rules every package shares |
| `data/met` | The imported data set: `catalog.json` and the reduced images, baked into the published images |
| `e2e` | Playwright checks against the running stack: what only a browser shows, such as the admin panels in Portuguese |
| `design/art-direction` | The three art directions for the artwork page, each a DTCG token set, in static HTML |
| `infra` | Caddy and Postgres configuration for `compose.yaml` |
| `docs` | `upstream-api.md` (The Met, probed live) and the decision records in `adr/` |

## Commands

- `pnpm install`: Node 24.21.0 and pnpm 12.9.1 are pinned (`devEngines`, `packageManager`) and downloaded on the first install. Always run through `pnpm`, never a bare `node`, or the machine's own Node is used.
- `pnpm run ci`: format check, lint, types and unit tests in every package. Must pass before any change is done.
- `pnpm --filter <package> <script>`: one package's script, e.g. `pnpm --filter @deckle/gateway test`.
- `docker compose up --wait`: the whole stack, production builds, healthchecked.
- `pnpm --filter @deckle/met run import`: fetches the curated works from The Met again and rewrites `data/met`, only where bytes changed. `run` is needed because `import` is also a pnpm command. It calls the museum, so it never runs in CI.
- `pnpm --filter @deckle/met run candidates`: searches The Met and sizes the works that could join the curated list. Also never in CI.
- `pnpm --filter @deckle/cms migrate:create <name>`, then `generate:types`: after any change to a CMS collection. Commit the migration and the types together; the CMS applies migrations itself as it starts.
- `pnpm --filter @deckle/cms dev` pushes the schema straight into its database. Point it at a throwaway one, never the stack's `cms` database, or the next migration stops to ask questions.
- `pnpm --filter @deckle/cms seed`: creates the editor, the gateway's read-only user and the starter stories, through the API of a CMS that is already running.
- `pnpm -r --if-present run test:integration`: the specs that need a real Postgres, in Testcontainers. Needs Docker running.
- `pnpm --filter @deckle/e2e test:e2e`: the browser checks, against the stack `docker compose up --wait` started. The first time, `pnpm --filter @deckle/e2e exec playwright install chromium` fetches the browser.
- `pnpm --filter @deckle/gateway schema:generate`: after any change to a resolver or GraphQL type. `schema.gql` is the committed contract, and CI fails when it is stale or when a change breaks a client.
- `pnpm --filter @deckle/gateway db:generate --name <change>`: after editing a `*.table.ts`. Commit the new files under `drizzle/`; the gateway migrates itself as it starts.
- `pnpm --filter @deckle/commerce schema`: prints the Shop API schema the gateway reads into `services/commerce/schema/`. CI fails when the committed file is stale (`schema:check`).
- `pnpm --filter @deckle/commerce migration:generate <name>`: after a change to Vendure's config or a custom field, run against a database that has every migration applied. Commerce migrates itself as it starts, and refuses to start when the database and the config differ.
- `pnpm --filter @deckle/commerce seed`: loads `data/met` into Vendure. It is idempotent by Met object id.

## Contracts between services

Everything runs on one Docker network. The browser only ever sees Caddy.

| Service | Listens on | Reached at |
| --- | --- | --- |
| `caddy` | 80 | `http://localhost:8080`: the store, `/graphql` (HTTP and WebSocket) to the gateway, `/assets/*` to commerce |
| `gateway` | 4000 | `http://gateway:4000`. `/graphql`, `/health`, `/hooks/*` and `/internal/*` (the last two never routed by Caddy) |
| `commerce` | 3000 | `http://commerce:3000`. `/shop-api`, `/admin-api`, `/assets`, `/dashboard`, `/health`; host port 8082 for the dashboard |
| `cms` | 3000 | `http://cms:3000`. `/admin`, `/api`; host port 8081 for the admin |
| `postgres` | 5432 | One database and one role per service: `commerce`, `cms`, `gateway` |
| `mailpit` | 1025 SMTP, 8025 UI | host port 8025 |

- **Commerce and CMS changes reach the gateway as signed webhooks.** `POST /hooks/commerce` and `POST /hooks/cms`, JSON, with `Deckle-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">` and a five-minute tolerance. The gateway turns each event into cache tags for the store.
- **The gateway vouches for its users to commerce.** It signs a short-lived EdDSA JWT (`iss` `deckle-gateway`, `aud` `deckle-commerce`, `sub` the Deckle user id) and publishes its keys at `GET /internal/jwks.json`. Commerce verifies it in a Vendure `AuthenticationStrategy` named `deckle`, so it holds no secret that could mint a login.
- **The gateway calls the Admin API with an API key, never a session.**
- **Missing data is `null`, never `""` or `0`.** Every reader renders it as a dash.
- **Commerce's API key is `<lookup id>:<secret>`**, 8 to 64 then 32 to 256 characters of `[A-Za-z0-9_-]`, and the gateway's `COMMERCE_API_KEY` is the same string. Commerce refuses to start with any other shape.

## Conventions

- TypeScript 6.0 and ESM everywhere. Node packages compile with `module: nodenext`. Each package sets its own `types`, since TypeScript 6 defaults it to none.
- Zod at every border: environment, upstream responses, webhooks, files read from disk. Code that ships to a browser imports `zod/mini`.
- Layers are enforced by each package's `eslint.config.js` through `restrictImports()`. Do not weaken a rule to make an import pass.
- Tests sit next to what they test as `*.spec.ts`. Anything that needs Postgres runs against a real one in Testcontainers, never a mock of the database.
- Comments explain why, at the line that needs it. No comments that restate the code.
- Everything written in the repository is in English: code, docs, commit messages.
- Commits go straight to `main`, a title only: conventional, lowercase, imperative and short, like `fix(gateway): retry the catalogue on a cold start`.
- A bug in a dependency is fixed with `pnpm patch`, with the reason next to it in `pnpm-workspace.yaml`.
- A decision with a trade-off gets a record in `docs/adr`, version pins included.
- Code written with an AI assistant is held to the same suite as any other. The tests are the guardrail: a change the suite cannot see is not done.

## Design changes

A new screen, or a visible change to one, starts as a static mock or screenshots the owner approves, in both themes and at phone width. Only then is it built, and the build is checked against the approved version.
