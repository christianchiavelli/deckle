# Gateway signing keys in Postgres

- Status: accepted
- Date: 2026-10-05
- Versions: jose 6.2.12, Postgres 18.6

## Context

The gateway vouches for its users to commerce with a short-lived EdDSA JWT, and commerce verifies it against `GET /internal/jwks.json`. Every replica must sign with a key that every replica publishes, and the keys must survive restarts, or tokens and cached key sets break.

## Decision

- Keys are Ed25519 (EdDSA), and each key's `kid` is the RFC 7638 thumbprint of its public half. They live in `signing_keys`: the public and private JWK, `not_before`, and a nullable `not_after`.
- The first start creates the first key inside a transaction that holds `pg_advisory_xact_lock(hashtext('deckle-gateway:signing-keys'))`, so replicas starting together agree on one key. Each replica re-reads the active key every 5 minutes, which is how it notices a rotation.
- The JWKS publishes the active key, any key whose `not_before` is still ahead, and keys retired less than an hour ago. It is served as `application/jwk-set+json` with `Cache-Control: public, max-age=300`, and Caddy never routes it.
- Tokens carry `iss` `deckle-gateway`, `aud` `deckle-commerce`, `sub` (the user's uuid), an optional `email`, and a `jti`. They live 30 s, against the contract's 60 s maximum, because each is used once, at once.
- Rotation is a data change for now, not a command. Insert the next key with a `not_before` at least ten minutes ahead (the JWKS max-age, plus the replicas' re-read interval), and give the current key the same instant as its `not_after`.

## Consequences

- The private key is stored unencrypted. Anyone who can read the gateway's database can mint tokens that commerce accepts. That is acceptable for a stack that only ever runs locally. A deployed version would encrypt `private_jwk` with a key-encryption key held outside the database, or keep the key in a KMS and sign there.
- The integration suite proves one key from two replicas started together, the same key set after a restart, and a token signed on one replica verifying against the other replica's key set.

## Rejected

- **A key in an environment variable or a file**: every replica must be provisioned with the same secret, and a rotation needs a redeploy.
- **HS256 with a shared secret**: commerce would hold a secret that can mint tokens, which is what the contract avoids.
- **A key generated per process**: replicas would publish different key sets, and every restart would invalidate the keys commerce had cached.
