# 41. A demo trade, placed through the real checkout

- Status: accepted
- Date: 2026-10-06
- Versions: Vendure 3.7.4, Payload 3.90.2
- Scope: `services/commerce/src/seed`, `apps/cms/src/seed`, `compose.yaml`

## Context

A fresh stack held the catalogue and little else. The dashboard's charts and order lists were empty, and Payload had one curation and three stories. Anyone opening either panel saw a shop that had never traded, with nothing to try the screens on. The data had to look like a shop's, with orders across weeks and in every state an order can reach, without an address the stack could mail a real person at, and without writing rows Vendure's own checkout would not have written.

## Decision

- **Orders go through Vendure's services, the way a checkout does.** Each order gets a guest customer with an address, a cart, shipping and the test payment. Then either a fulfilment that ships and is delivered, or a cancellation and a refund, settled by hand since the test payment has no refund of its own. One transaction per order: Vendure takes a payment only inside one, and a run that stops halfway leaves no order half placed.
- **Then the dates move back.** Vendure stamps every row with the moment it was written. Once an order commits, its rows (the order, its lines, payment, fulfilment, refund and every history entry) take the plan's dates instead: a cart opened minutes before payment, a parcel packed two hours before it left, a refund an hour after the cancellation. A customer dates from their first checkout. The charts and lists read these like any other order's.
- **A pure, seeded plan decides what happens** (`demo-plan.ts`, a mulberry32 generator). Forty invented people live in real cities of the countries the shop ships to, with addresses at `example.com`, a domain reserved for examples. About 150 orders fall over 60 days: busier lately and in the evening, mostly a single print, A3 the most common size, and the five best-known works three times as likely as the rest. One in twenty is cancelled within a day. The rest ship one to three days after payment, in the shop's working hours, and arrive three to eight days later, by day, so each order's state follows from its dates and today's.
- **The plan is drawn back from the end of today, in UTC.** Drawn from the moment of the run, it would differ on every run, and a second run would add orders. Drawn from the next midnight, it is the same on any day, moved by whole days, and it leaves out what is planned for later today. A later run finds each customer by email address with their first planned orders already placed, and adds only the ones beyond them: nothing on another day, the evening's orders after a run in the morning. Weekends are not busier, since the day of the week would make the plan differ from day to day.
- **On by default in compose, off with one variable.** `commerce-seed` places the trade after the catalogue when `DEMO_DATA` is `true`. Compose sets it from `DECKLE_DEMO_DATA`, `true` unless given; the service's own default is `false`, so nothing but compose turns it on.
- **The editorial content is not demo data.** Payload's seed always creates five curations, twelve short stories and two drop pages, by slug. The nine stories added here say only what The Met's record of the work says (date, series, medium, size, subjects and credit line), and cite that record. A unit test checks every slug and source against `data/met`.

## Consequences

- The first `docker compose up` takes about half a minute longer: the trade placed its 150 orders in 25 seconds on a laptop. CI's stack job seeds it too, from the published image, so every push proves it.
- Mailpit receives each order's confirmation email, dated the day the seed ran.
- The trade does not move with time. An order awaiting shipment on the day of the seed waits for good, and two months later the dashboard's recent charts are empty again. `docker compose down -v`, then `up`, starts a fresh trade.
- The backdating writes to Vendure's tables after its services have. If a later Vendure changes those entities, the integration test shows it: it runs the trade three times and compares every order's state and date with the plan.

## Rejected

- **Orders through the Shop API**, as a browser would place them: the same service calls behind HTTP, with a session per customer, for no more fidelity (see 0035).
- **SQL inserts or a database dump**: faster, but a second rendering of Vendure's schema to keep in step, and orders whose totals, taxes and history no checkout produced.
- **Fixed dates**: the same rows on every machine, but the dashboard's recent charts would be empty within weeks of the commit.
- **A fake-data library**: a dependency for forty names. Written out, the people read as real customers and stay the same from one version of the library to the next.
- **The trade inside the catalogue seed**: the catalogue is the shop, the trade a demonstration that a stack used for anything else turns off.
