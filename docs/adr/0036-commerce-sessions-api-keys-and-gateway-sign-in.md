# 36. Commerce sessions: cookies for the dashboard, bearer for the gateway, API keys for the Admin API

- Status: accepted
- Date: 2026-10-05
- Scope: `services/commerce`

## Context

Three clients reach commerce. The dashboard runs in a browser on commerce's own origin. The gateway calls the Shop API on behalf of signed-in customers and the Admin API for itself, always from its server. Vendure's `tokenMethod` is one setting for both APIs, and the dashboard, unless told otherwise, follows the server: given bearer, it keeps the session token in `localStorage`, where any script on the page can read it.

## Decision

**Token methods** are `['cookie', 'bearer', 'api-key']`.

- The dashboard is built with `tokenMethod: 'cookie'` and gets an `httpOnly`, `SameSite=Strict` cookie (`deckle-admin-session`). A middleware withholds the `vendure-auth-token` header on `/admin-api`, so an Admin API session never travels in a header a script could read. `cors: false` and Apollo's `csrfPrevention` close the rest.
- The Shop API answers with `vendure-auth-token`, which the gateway keeps server side and sends back as a bearer token. The browser never sees it.
- The gateway calls the Admin API with an API key in `vendure-api-key`, never a session.

**The gateway's API key** uses Vendure 3.6+ API keys: `<lookup id>:<secret>`, the lookup id stored in clear to find the key, the secret stored hashed. The seed makes sure the key whose value is `GATEWAY_API_KEY` exists, creating or rotating it through a strategy that returns that lookup id and secret instead of random ones (only the seed's config uses it). The key's role, `deckle-gateway`, has `ReadCatalog` and `UpdateProduct` (drops adjust variants and stock) and nothing over orders, customers or administrators. API key secrets are hashed with SHA-256, compared in constant time, instead of Vendure's default bcrypt: the secret is at least 32 random characters, so a slow hash adds no protection, only a bcrypt check on every gateway request. `lastUsedAt` is written at most every five minutes.

**Customers sign in through the gateway only.** The Shop API has one authentication strategy, `deckle`: `authenticate(input: { deckle: { token } })` with an EdDSA JWT the gateway signs (`iss` `deckle-gateway`, `aud` `deckle-commerce`, `sub` the Deckle user id, `exp` at most 60 s ahead, 5 s of clock tolerance), verified against the gateway's JWKS with `jose` (2 s fetch timeout, 30 s cooldown, keys cached for 10 minutes). Commerce holds no secret that could mint a login. Without the native strategy, the Shop API's own login, registration and password reset answer `NativeAuthStrategyError`. The Customer is created on first sight with `verified: false`, so Vendure 3.7 refuses to attach it to an existing account that happens to share the email address.

## Consequences

- Vendure's cookie secret is random per process (its default); a server restart signs the dashboard out. The brief's environment has no cookie secret, and locally that is fine.
- A customer without an email gets `<user id>@users.deckle.invalid` (RFC 2606), and every customer gets empty first and last names: Vendure's columns are not nullable. Both break "missing is null"; the gateway owns names and email and never reads these.
- A gateway that cannot reach its own JWKS makes `authenticate` fail with a server error rather than an invalid-credentials answer, so it retries instead of showing a wrong password message.

## Rejected

- Bearer everywhere: the dashboard's session would sit in `localStorage`.
- Cookies for the Shop API: the gateway would need a cookie jar per customer for nothing.
- A shared HMAC secret for customer tokens: commerce could then mint them.
- bcrypt for API keys: cost on every request, no gain for random secrets.
