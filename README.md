# Deckle

A headless print shop for public-domain works from [The Met's Open Access collection](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access), with numbered editions that never oversell.

Every work is offered only in the paper sizes its scan can hold at 240 ppi, so a print is never an upscaled guess. Drops release fifty numbered copies at a set hour, first come, first served, one per passkey.

Next.js 16 and React 19.3 in front, a NestJS 12 GraphQL gateway in the middle, Vendure 3.7 and Payload 3 behind it, all on Postgres 18.

> The store is being built page by page, each from a design approved first. Today it serves the front page, every work's page, the prints with their filters, the collections, the journal, the search and the page on how prints are sized; the cart and the drops come next.

---

## Setup

Docker, and nothing else. No API key or account.

```bash
docker compose up --wait
```

That pulls the images CI publishes; add `--build` to build them from the checkout instead. Then:

| Where | What |
| --- | --- |
| `http://localhost:8080` | The store: the prints at `/prints`, each work's page such as `/prints/melencolia-i`, `/collections` and `/journal` |
| `http://localhost:8080/graphql` | The gateway: the only API the browser will ever see |
| `http://localhost:8081/admin` | Payload, for stories, curations and drop pages: `editor@deckle.localhost`, `deckle-editor` |
| `http://localhost:8082/dashboard` | Vendure's dashboard: `superadmin`, `deckle-superadmin` |
| `http://localhost:8025` | Mailpit, where order and drop emails land |

The shop starts with two months of trade, so the dashboard has something to show: about 150 orders from 40 invented customers at `example.com`, placed through Vendure's own checkout and dated back, some still to ship, most delivered, a few cancelled and refunded. `DECKLE_DEMO_DATA=false docker compose up --wait` leaves them out. Payload starts with five curations, twelve short stories and two drop pages, every fact in them from The Met's record of the work.

```bash
curl -s http://localhost:8080/graphql -H 'content-type: application/json' \
  -d '{"query":"{ artwork(slug: \"melencolia-i\") { title sizes { size available ppi } story { title } } }"}'
```

To work on it: pnpm 11 or newer, which switches itself to the pinned 12.9.1 and downloads Node 24.21 on the first `pnpm install`.

---

## Why this data set

The Met marks each record public domain or not, and its Open Access images are CC0, downloadable in full without a key. Its API does not say how large an image is, so the importer reads the size from each file's own header.

That size decides what can be sold. Dürer's _Melencolia I_ is a 2,820 × 3,561 px scan: 447 ppi at A4, 302 at A3, and 210 at A2, below the floor, so A2 is not offered. None of the 48 works reaches A1, which needs at least 4,668 px on a side: no original The Met serves for them is over 4,000.

---

## How it is built

- **Buy the platforms, build the drop.** Vendure runs the catalogue, cart and checkout; Payload runs the editorial. Code of our own exists only where neither helps.
- **One origin.** Caddy serves the store, GraphQL over HTTP and WebSocket, and the images, so there is no CORS and every cookie is first-party.
- **The gateway owns the contract.** Its code-first schema is committed, and CI fails on a stale file or a change that would break a client. Swapping Vendure for Shopify Plus would be an adapter in the gateway, not a rewrite.
- **The gateway vouches for its users.** It signs short-lived EdDSA tokens and publishes its keys; Vendure verifies them in an `AuthenticationStrategy` and holds no secret that could mint a login.
- **Changes arrive signed and once.** Vendure and Payload post HMAC-signed webhooks, deduplicated in the same transaction as their effect, and the gateway turns each one into cache tags and a live GraphQL event.
- **Pages come from the cache until they would be wrong.** The store renders on the server from reads tagged with the same words the gateway drops, so a new price shows on the next request, with no timer to wait out. Nothing reads at build time, so the image builds without a stack.
- **Postgres does what Redis would.** Vendure's job queue and the gateway's pub/sub both run on it; LISTEN/NOTIFY carries events between gateway replicas, tested with two of them.
- **Missing data is `null`, never `""` or `0`**, and every reader shows it as a dash.

AWS and Shopify Plus are left out on purpose: the stack runs on a laptop with nothing to pay for, and Vendure stands in for the commerce platform behind the same seams.

---

## Testing

```bash
pnpm run ci                                  # format, lint, types, and unit tests with coverage
pnpm -r --if-present run test:integration    # against a real Postgres 18, in Testcontainers
pnpm -r --if-present run schema:check        # each committed schema matches the code
pnpm --filter @deckle/e2e test:e2e           # in a browser, against the running stack
```

Anything that touches the database runs against a real one, never a mock: migrations racing across replicas, a webhook delivered twice at once, an event that must not leave a rolled-back transaction. CI then builds the four images and runs the whole stack from them, with the store checked in a browser and by axe in both themes.

---

## Reading further

[docs/upstream-api.md](docs/upstream-api.md) records how The Met's API behaves today, probed live, including a search endpoint retired on 1 October 2026. Each trade-off has a record in [docs/adr](docs/adr/README.md), version pins included, and [AGENTS.md](AGENTS.md) is how to work on the code.

---

## Licence

Code under MIT. The images and records are The Met's, released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
