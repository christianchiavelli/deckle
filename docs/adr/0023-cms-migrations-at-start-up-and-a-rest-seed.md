# 23. CMS: migrations at start-up, and a seed that talks REST

- Status: accepted
- Date: 2026-10-05
- Versions: Payload 3.90.2, Next.js 16.3.8 (Turbopack build, `output: 'standalone'`), Node 24.21.0

## Context

The CMS is Payload in its own Next.js app, shipped as Next's standalone output: a `server.js` and the files it was traced to need, without the full `node_modules`. That leaves out Payload's CLI, so `payload migrate` cannot run in the image, and neither can a seed written against the Local API, which needs Payload's whole runtime.

Two facts about this stack shaped the answer, both checked rather than assumed:

- **Next.js bundles `instrumentation.ts` apart from the routes.** A probe build (a `register()` storing Payload's `getPayload`, a route comparing it with its own import) answered `sameModule: false`. An instance started in `register()` would be shared with the routes through Payload's global cache, and the routes would then format its errors with their own copies of Payload's error classes: `instanceof` fails and validation errors lose the field details the admin shows.
- **The Postgres adapter's `destroy()` does not close its pool**, and the adapter keeps one client checked out for good. A throwaway instance started only to migrate would hold a connection for the life of the process.

## Decision

1. **Migrations are committed and passed to the adapter as `prodMigrations`.** Payload's docs give this as the way to migrate a long-running server or container at start-up: in production, Payload applies any migration not yet recorded before it finishes initialising, and a failed migration exits the process.
2. **`instrumentation.ts` makes that happen at boot.** Next.js runs `register()` once as the server starts, before it handles a request. `register()` validates the environment with Zod and, on a bad value, logs every problem and exits with status 1: Next.js 16.3 only logs an error thrown from `register()` and goes on serving, every request failing. It then sends one request to the server's own `GET /api/health`; Next.js answers it once ready, and that request starts the routes' one Payload instance: migrations run, then the jobs runner. Requests arriving meanwhile wait on the same start. Development still pushes the schema, as Payload intends.
3. **`next build` never needs runtime secrets.** The build evaluates the Payload config while collecting route data; during `NEXT_PHASE=phase-production-build` alone the environment passes through unchecked. Nothing built in that phase serves a request.
4. **The seed is a REST client.** `pnpm --filter @deckle/cms seed` (or `node seed.mjs` in the image) signs in as the admin (`first-register` on an empty database, `login` otherwise), creates or updates the gateway's user, and creates the starter curation and stories if they are missing. esbuild bundles it into one file with Zod; it needs no Payload, goes through the same access control and hooks as any editor, and proves the gateway's key by calling `/api/users/me` with it. It targets `http://127.0.0.1:$PORT`, so in compose it runs inside the CMS container's network namespace.
5. **The standalone trace is the image's production tree.** It holds only what the server reaches, which is smaller than `pnpm deploy --prod` would be, so the image copies `.next/standalone`, `.next/static` and `seed.mjs` onto a clean Node image and runs as `node`.

## Consequences

- One Payload instance per process, one runner, no stray connection.
- The server accepts connections a moment before Payload has finished migrating; those requests wait rather than fail. The healthcheck turns healthy only after the start.
- Running the dev server against a database the image also uses would record a "dev push" and make the next production start stop at Payload's confirmation prompt. Use a separate database for `pnpm dev`.
- Only one CMS process should migrate at a time; Payload takes no lock. Compose runs one.
- The seed needs a running CMS. In compose that is a dependency on a healthy `cms`.

## Alternatives rejected

- **`payload migrate` before `node server.js`.** Needs the CLI and the full dependency tree in the image, which is the size standalone exists to avoid.
- **A migration script bundled with esbuild.** Bundling Payload, its Postgres adapter and the Lexical server code outside Next is fragile and would be a second build to keep working.
- **A second Payload instance in `register()`.** Separate module copies (measured above) and a connection that `destroy()` cannot release.
- **Migrating on the first outside request.** Same mechanism, but the start would depend on whoever calls first; the jobs queue would not run until then.
- **A Local API seed.** Natural in Payload, but it cannot run from the standalone image.
