# 47. A passkey is the whole account

- Status: accepted
- Date: 2026-10-07
- Versions: @simplewebauthn/server 14.0.3
- Scope: `services/gateway/src/accounts`

## Context

A drop sells one copy per person, so it must know who is claiming; buying an open edition must not. The spec puts identity in the gateway, with passkeys, and has commerce trust it through its `deckle` authentication strategy (ADR 0036), so that commerce could be swapped without losing anyone's account.

## Decision

- **No name, no email, no password.** An account is an id, its passkeys point to it, and commerce knows the same id as its customer's external identifier. The receipt's address is asked per order (ADR 0048), not kept.
- **Making a passkey makes the account**: `startPasskeyRegistration`, then `finishPasskeyRegistration` with the device's answer. Signing in again is `startPasskeySignIn` and `finishPasskeySignIn`. The options and answers travel as the JSON `@simplewebauthn/browser` reads and writes, checked by a Zod schema before SimpleWebAuthn checks the bytes.
- **Discoverable, and verified by its owner.** `residentKey: required`, so signing in needs no username; `userVerification: required`, so the device asks for a face, a finger or a PIN, and the passkey alone is not enough. Attestation is `none`: Deckle does not choose its users' devices.
- **Each challenge is answered once, by the browser that asked, within five minutes.** The ceremony is kept in `passkey_ceremonies`, one per session, and deleted in the statement that reads it, so two answers to one challenge cannot both find it.
- **The relying party is the store's origin**: `PUBLIC_ORIGIN` for the expected origin and its host for the RP ID. Caddy's `Permissions-Policy` allows `publickey-credentials-*` on that origin alone.
- **The label is not personal**: the device lists the passkey as "Deckle collector 7F3A", from the account's id.
- **Counters only go up.** A sign-in records the higher of the stored and the new counter, so two sign-ins racing with one passkey never lower it.

## Consequences

- There is no account recovery: a person who loses every device with the passkey loses the account, and what it holds is the copies they bought, whose orders commerce keeps. Synced passkeys (`backedUp`) make that rare; a recovery email would be the next step, and its own decision.
- An account cannot be found by anything but a passkey, so there is nothing to phish and nothing to leak.
- Tests prove both ceremonies with a software authenticator that signs with a real P-256 key; the store's will use Playwright's virtual authenticator.

## Rejected

- **Email and a magic link**: the spec asks for passkeys, and an inbox is a second identity to secure.
- **Username first, then the passkey**: a discoverable credential makes it unnecessary.
- **`userVerification: preferred`**: a passkey that never asks its owner is a key anyone holding the device can use.
- **Attestation**: it would refuse devices for no gain in a shop.
