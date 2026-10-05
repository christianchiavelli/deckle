# 1. Buy the platforms, build only the drop

- Status: accepted
- Date: 2026-10-05

## Context

A print shop needs a catalogue, a cart, a checkout, orders, editorial content and, for Deckle, numbered limited editions sold under heavy concurrency. Most of that is solved by commerce platforms and content systems; writing it again would show effort, not judgement.

## Decision

- **Vendure** does the catalogue, cart, checkout and orders.
- **Payload** does the editorial side: each work's story, curated collections and the page of each drop.
- Deckle writes its own code only where the platforms do not help: the **drop**, in a **NestJS gateway** that also owns identity and joins commerce, content and drops into one GraphQL schema.
- The store talks to the gateway only. Nothing but the gateway talks to Vendure or Payload.

## Consequences

- Replacing Vendure with Shopify Plus, or Payload with another CMS, means writing an adapter in the gateway, not rewriting the store.
- The gateway is a real piece of software to maintain, with its own tests, schema contract and failure modes.
- Two platforms each bring their own runtime, admin and upgrade path.

## Alternatives considered

- **Everything in one Next.js app with a database.** Less to run, but it hides the integration work a platform-based shop really involves, and the drop's concurrency would share a process with rendering.
- **The store calling Vendure and Payload directly.** Fewer moving parts, but the platform's shape leaks into every page, and identity would live inside Vendure.
