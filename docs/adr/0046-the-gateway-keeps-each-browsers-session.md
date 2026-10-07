# 46. The gateway keeps each browser's session

- Status: accepted
- Date: 2026-10-07
- Versions: NestJS 12.1.2, Drizzle 0.45.3, Postgres 18.6
- Scope: `services/gateway/src/sessions`

## Context

A cart, a passkey sign-in and a held copy all belong to one browser, which reaches the gateway only through Caddy, on the store's own origin. Commerce keeps its own sessions, as bearer tokens (ADR 0036), and a token that opens a customer's orders must never reach a script on a page. The spec asks for the session in Postgres behind an `httpOnly` cookie, and two gateway replicas must agree on it.

## Decision

- **The cookie carries a secret, Postgres its hash.** Each session is 32 random bytes, sent as `deckle_session` (`__Host-deckle_session` over HTTPS, where the prefix's `Secure` is possible), `HttpOnly`, `SameSite=Lax`, `Path=/`. The `sessions` table keys each row by the secret's SHA-256, so a copy of the table opens nothing. Lax, not Strict: a link followed from an order email must arrive signed in; a cross-site form post is refused anyway by Nest's cross-origin check on `Sec-Fetch-Site` and `Origin`.
- **Made when something needs keeping, not on every visit.** Reading the cart or the viewer without a cookie writes nothing and asks commerce nothing. The first print added, or the first passkey ceremony, makes the session and sets the cookie.
- **Thirty days, sliding once a day.** A visit renews a session last seen more than a day ago, and only then sends the cookie again, so most requests write nothing. Each replica deletes expired sessions every ten minutes, `FOR UPDATE SKIP LOCKED` keeping them out of each other's way.
- **A new session at every change of who is signed in.** Signing in or out replaces the row and the cookie in one transaction, so a session id seen before (a fixation, a stolen cookie from before sign-in) opens nothing after it. The cart's commerce token moves to the new session; the customer's does not.
- **Commerce's tokens live in the row.** `cart_token` is a guest session holding the cart, `customer_token` the signed-in customer's (ADR 0048). The gateway sends them as bearers and stores whatever new token commerce answers with, as when a lapsed one is replaced.
- **A subscription reads the session from its WebSocket upgrade, and cannot start one**: an upgrade has no response to set a cookie on.

## Consequences

- No session table row for a visitor who only browses: the stack's cache and its database stay out of each other's way.
- Signing out keeps the cart, since it was the browser's before anyone signed in. A shared computer keeps a guest's cart, as most shops do.
- Over plain `http://localhost` the cookie cannot be `Secure`; the `__Host-` name and `Secure` follow `PUBLIC_ORIGIN` the day it is HTTPS.
- A lost database loses every session: everyone is signed out and every cart is forgotten, while commerce still holds the orders.

## Rejected

- **A JWT in the cookie**: it cannot be revoked at sign-out without a list kept server side, which is a session table again, and it would have to carry commerce's tokens.
- **Commerce's own session cookie, passed through**: the browser would hold a token that opens a customer's orders, and Caddy would have to route commerce.
- **A session on every first visit**: a row per crawler and per tab, for nothing kept.
- **`cookie-parser`**: NestJS 12.1 parses and sets cookies itself.
