# 2. One origin for the browser, through Caddy

- Status: accepted
- Date: 2026-10-05

## Context

The browser needs the store's pages, the GraphQL API over HTTP and WebSocket, and the product images. Served from different origins, that means CORS rules, third-party cookies for the session, and a WebSocket handshake across origins.

## Decision

Caddy is the only door: `http://localhost:8080` serves the store, `/graphql` (HTTP and WebSocket) proxied to the gateway, and `/assets/*` proxied to Vendure's asset server. The gateway's webhook and internal routes are never routed through it. It runs in plain HTTP, since browsers treat `http://localhost` as a secure context, which passkeys need, while HTTPS would mean trusting Caddy's local certificate authority on every machine.

## Consequences

- No CORS configuration anywhere, and the session cookie is first-party.
- Caddy finds every gateway replica through Docker's DNS, so the load test's two replicas need no change to it.
- One more container, and one place where a wrong route breaks everything; the stack's CI job checks the routes through the front door.

## Alternatives considered

- **Next.js rewrites** to the gateway: WebSocket upgrades are not reliably proxied, and every API call would pass through the store's process.
- **CORS between origins:** more configuration, and the cookie becomes third-party.
