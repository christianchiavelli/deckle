# 10. Drops are first come, first served, locked in the database

- Status: accepted
- Date: 2026-10-05

## Context

A drop sells a numbered edition: say 50 copies, and a thousand people arriving in the same second. Selling copy 51, or the same number twice, is the failure that matters.

## Decision

- **First come, first served.** Whoever arrives takes a numbered copy, held for **ten minutes** while they pay; a hold that expires goes back to the pool.
- The **lock lives in the database**: a constraint, `FOR UPDATE SKIP LOCKED` and a transaction, never an `if` in application memory.
- **k6** runs the drop against **two gateway replicas**, which proves the lock holds across processes and is not an artefact of a single one.
- **Vendure's stock is the second barrier.** Its `StockShortfallEvent`, new in 3.7.4, must never fire, and an alarm logs it if it does.

## Consequences

- Correctness under concurrency rests on Postgres guarantees that can be tested and explained.
- A reviewer can try a drop alone, at any time, without waiting for anything.
- Holds need a sweeper, and the ten-minute clock has to be visible to the buyer.

## Alternatives considered

- **A lottery:** fairer to slow connections, but nobody can test it without waiting for a draw.
- **A lock in Redis or in memory:** faster, and wrong as soon as a second process exists.
