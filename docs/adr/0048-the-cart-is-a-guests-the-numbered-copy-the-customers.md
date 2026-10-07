# 48. The cart is a guest's; a numbered copy is the customer's

- Status: accepted
- Date: 2026-10-07
- Versions: Vendure 3.7.4
- Scope: `services/gateway/src/checkout`, `services/gateway/src/drops`, `services/commerce/src/checkout`, `services/commerce/src/seed`

## Context

Two things are bought in Deckle, and they are bought differently. Open-edition prints go in a cart, with no account, and ship at a flat rate. A drop's numbered copy is held for ten minutes for a signed-in person, paid on its own, and ships free. Vendure keeps one active order per guest session, and one per signed-in customer across all of their sessions, so a signed-in person's cart and their copy would share an order.

## Decision

- **Two commerce sessions per browser.** The cart lives in a guest session that is never signed in, so it never merges with a customer's order and needs no account; its checkout sets the guest's email and names. A copy is paid in the customer's session, opened on the gateway's signed word (ADR 0036) the first time the account pays, and opened again if commerce has let it lapse, which commerce shows by answering with a token of its own. That order holds the one copy and nothing else: lines a failed attempt left are removed first.
- **A drop's edition is a product of its own.** Every work shares one paper-size option group, so a second A3 variant beside the open edition's would repeat an option. The commerce seed makes, for each drop in `@deckle/drops`, a product named after the drop, on the work's image, filed under `edition: numbered` instead of `open`, which keeps it out of "All prints". Its one variant carries `editionSize`, tracks its stock, and starts with as many copies as the edition has. The gateway's catalogue reads leave out anything without a Met object id.
- **Shipping is commerce's to decide.** A second method, "Shipping for a numbered copy", costs nothing, and its eligibility checker offers it only to an order of numbered copies. The cart's first print brings the flat rate along, so the cart's total is what checkout charges.
- **The copy's order carries its number and its receipt's address**, as two order custom fields the gateway sets. The order confirmation handler sends the receipt there, and never to the placeholder address a passkey customer has.
- **One `placeOrder` and one `payForCopy`.** Each takes the checkout form, checked field by field before commerce is asked anything, and runs the steps in order: contact, address, shipping, the state change, the test payment. A declined payment leaves the order waiting for payment; the next change or attempt brings it back first.

## Consequences

- A signed-in person buys prints as a guest, with their email typed at checkout. Their account page lists copies only, as the spec's "no account for ordinary purchases" means.
- The dashboard shows each copy's number on its order, and the edition's stock counts down as copies are paid.
- The drops' facts are written once, in `packages/drops`; the gateway records them, commerce seeds their editions, and the CMS holds their words.

## Rejected

- **The copy in the cart**: one checkout, but a ten-minute hold mixed with prints, a shipping rule per line, and a cart whose meaning changes on sign-in.
- **A custom `ActiveOrderStrategy` for a second active order**: Vendure supports it, but the default strategy would also have to learn to skip the copy's order; two sessions need no plugin.
- **Draft orders through the Admin API**: the gateway's key would need order permissions it does not have, and the order would not be the customer's own.
- **An edition option group on every work**: every existing variant would need the new option.
