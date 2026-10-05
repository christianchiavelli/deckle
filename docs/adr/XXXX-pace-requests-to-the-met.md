# XXXX. One request a second to The Met, retried with jitter

- Status: accepted
- Date: 2026-10-05

## Context

The Met's documentation asks for no key and says to keep under 80 requests a second. The CDN in front of the API, Imperva, enforces something else: on 5 October it blocked this address with its own HTML `403` after about 80 requests within a minute, at four requests at a time and again at one request every half second, whether or not its cookies were sent back. One request a second ran 240 requests without a block, and each block lifted within a minute. The image host is a separate site behind the same CDN. The probes are in [docs/upstream-api.md](../upstream-api.md).

The importer and the candidates script are the only callers, both run by hand: nothing in Deckle talks to The Met at runtime.

## Decision

- **The collection API**: one request at a time, each started at least a second after the one before, so at most 60 a minute.
- **The image host**: two at a time, a second apart, since a download of a few megabytes takes longer than its turn.
- **Retries** for network failures, timeouts, `429`, `5xx` and the CDN's `403` page: four at most, each after a wait drawn at random between zero and a ceiling that doubles from one second to a minute ("full jitter"). A `Retry-After` is honoured up to that minute. After the CDN's page, a minute's wait comes first, since that is how long a block lasted. Every attempt is paced like a first one. Any other status goes back to the caller as a typed error, unretried.
- **A timeout per attempt, body included** (`AbortSignal.timeout`): 20 s for JSON and for a header probe, five minutes for an original, so a stalled download is cut off as well as a slow answer.
- A **`User-Agent`** that names the project and where to find it: `Deckle/0.1 (+https://github.com/christianchiavelli/deckle)`.
- The pacing is a small gate in the package (`api/gate.ts`), not a dependency: a semaphore and a reservation of start times, in some fifty lines with their own tests.

## Consequences

- A first import of 48 works took about four minutes, mostly downloads; a re-run with the originals cached takes a minute, 48 requests at the gate's pace.
- Listing candidates costs about a second for every object read, and the 559 read while curating took several runs. That is the price of never being blocked halfway through an import.
- The limits are constants in `DEFAULT_CLIENT_OPTIONS`; a test or another caller can pass its own.

## Alternatives considered

- **The documented 80 a second, or anything near it**: blocked within seconds.
- **`p-limit` or `bottleneck`**: either would do, but the gate is small, typed and tested here, and pacing by start time is the one behaviour needed.
- **Backing off exponentially without jitter**: two importers blocked together would come back together.
- **Treating the CDN's `403` as final**: the block is temporary, and an import of 48 works should not die on the 47th because of it.
