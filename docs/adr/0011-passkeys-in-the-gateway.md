# 11. Passkeys in the gateway

- Status: accepted
- Date: 2026-10-05

## Context

A drop allows one copy per person, so a drop needs to know who is buying. An ordinary purchase does not.

## Decision

- Sign-in is a **passkey**, handled in the **gateway** with SimpleWebAuthn 14. The session lives in Postgres behind an **httpOnly cookie**.
- Vendure accepts the gateway's word through an **`AuthenticationStrategy`**: the gateway signs a short-lived token, and Vendure checks it against the gateway's published keys, so it holds no secret that could mint a login.
- An **ordinary purchase needs no account**. A passkey is required only to **join a drop**.

## Consequences

- Identity stays outside the platform: replacing Vendure does not break anyone's login.
- No passwords to store, reset or leak.
- The gateway carries the security weight of sessions, CSRF and key rotation.

## Alternatives considered

- **Vendure's own customer accounts:** the platform would own identity, and passwords would come with it.
- **An account for every purchase:** friction for the purchases that need none.
