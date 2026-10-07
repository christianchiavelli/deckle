# 49. A drop never sells a fifty-first copy

- Status: accepted
- Date: 2026-10-07
- Versions: Postgres 18.6, Drizzle 0.45.3, Vendure 3.7.4
- Scope: `services/gateway/src/drops`, `packages/drops`

## Context

A drop is fifty numbered copies, released at a set hour, first come first served, one per person, each held for ten minutes while its claimer pays. A thousand people may press the button in the same second, on two gateway replicas. The spec asks for the lock to live in the database, with constraints, `FOR UPDATE SKIP LOCKED` and a transaction, not an `if`, and for Vendure's stock to be a second barrier whose `StockShortfallEvent` never fires.

## Decision

- **A row per copy, made with the drop.** `drop_copies` holds exactly fifty rows: there is no fifty-first to hand out. A check constraint ties each status to its fields (`open` has no holder, `held` a deadline, `sold` an order code), so a half-written copy cannot exist.
- **A claim takes the lowest open row under `FOR UPDATE SKIP LOCKED`.** Rows another claim has locked are skipped, not waited for, so concurrent claims each take a different copy, and a claim that finds every row locked or taken says so at once instead of queueing behind them.
- **The rules a person is held to are indexes.** A partial unique index on `(drop, holder)` gives one copy per person, held or paid; another on `holder` where `status = 'held'` gives one hold at a time, since commerce keeps one open order per customer. The claim asks first, to spare a refused update, and reads a unique violation as the same answer when two tabs race.
- **The clock is the database's.** A hold ends at `held_until`, set with `now()`; a hold that ran out counts as open, to claims and to the stock, the moment it ends. A sweeper on each replica opens lapsed holds every second, under `SKIP LOCKED`, which is what tells the people watching that a copy came back.
- **Paying keeps the copy locked.** The sale locks the held row for as long as commerce takes the payment, so the sweeper cannot reopen it and a second payment is turned away, not queued. It is marked sold, with commerce's order code, in the same transaction, only if the payment went through; a payment started in time finishes even if the ten minutes run out during it.
- **Commerce's stock is the second barrier.** Each edition's variant starts with as many copies as the drop. If the first barrier ever let a fifty-first through, commerce would refuse it with `InsufficientStockError`, which the gateway logs at error level.
- **The live count reads the database, once per burst.** Every change publishes only the drop's slug, inside its transaction, over the Postgres pub/sub (ADR 0028). Each replica gathers 150 ms of events, reads the copies once, and hands that to every watcher it holds, so a thousand claims cost each replica a handful of reads, and the numbers are never a sum kept in memory.

## Consequences

- The integration suite claims a thousand times at once from two pools, as two replicas would, and finds fifty copies held by fifty people; the load test does the same through two gateways (item 6).
- A claim that skipped rows another claim held may answer "nothing open" while one of those claims fails and rolls back. Every claimer is a different person in practice, and the copy shows as open at the next read.
- A gateway that dies between commerce's payment and its own commit leaves the copy held, and paid in commerce; the sweeper reopens it when its time runs out, and commerce's stock refuses the copy to the next person. The logs show it, and the copy's number would have to be set right by hand.
- The live count can be up to a second late about a lapsed hold, and 150 ms about anything else.

## Rejected

- **A counter on the drop row**: every claim would wait for the one row, which serialises the whole drop.
- **Advisory locks or Redis**: a lock outside the data it protects, and for Redis another service.
- **Holding the drop row `FOR UPDATE`**: correct, but one claim at a time.
- **The stock in commerce alone**: Vendure checks stock as it adds a line and allocates it at payment, so two buyers can hold the last copy in their carts; that is the race `StockShortfallEvent` exists to report.
- **Sending the counts in each event**: two transactions counting before either commits publish the same numbers, and the later ones can arrive first.
