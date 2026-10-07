# 43. The store browses from one cached catalogue

- Status: accepted
- Date: 2026-10-07
- Versions: Next.js 16.3.8, Vendure 3.7.4, Payload 3.90.2
- Scope: `apps/store/src/views`, `apps/store/src/app`, `services/commerce/src/seed`, `services/gateway`, `apps/cms/src/collections/stories.ts`, `apps/cms/src/collections/curations.ts`, `packages/met/src/curation.ts`, `packages/cache-tags`

## Context

The approved browsing screens add a page of every print with filters by technique, century and size, a search, the editor's collections, a journal and a page on how prints are sized. Building them on real data showed four problems:

- Commerce's technique taxonomy came from splitting The Met's medium on commas and "and". "Burnished aquatint, scaper, roulette, lavis (along the top of the landscape and within the landscape)" became five techniques, two of them "Lavis (along the top of the landscape" and "Within the landscape)", and "printed in gray and black" gave a technique called "Black".
- The Met photographed one print, Harunobu's _Two Young Women on a Verandah_, beside a grey scale. The shop sold that scan whole, target included, and sized it from the whole width, so it offered A2.
- The journal's cards show a detail of each print, and nothing said which.
- The gateway turned the collections page away as too complex. It priced a curation at 48 works, a guess, and the page asked for each work's whole tile in every curation: 10,921 against a limit of 2,500. Nothing reads at build time, so the build passed and the error waited for the first reader.

## Decision

- **The store filters, counts and searches the catalogue itself.** It is one read of 48 works, the gateway's largest page, already cached under `catalog` for the front page and the work pages. The prints page narrows it by technique, century and the size a buyer wants, counts each choice within the others, and orders it oldest first; the search folds accents and case and finds the works whose title, maker, medium, technique or culture hold every word. All of it is pure functions under `src/views`, tested at 100%.
- **A choice is an address.** Filters are links, `/prints?technique=etchings&century=18th-century&size=a3`, so a choice can be shared, works before any script loads, and is cached as the page. A value no work has is no choice: an old or mistyped address shows every print.
- **Commerce files each work under one technique family**: woodblock prints, woodcuts, lithographs, engravings, etchings, mezzotints, drypoints or aquatints, from the first process The Met names. The gateway gives each artwork that `technique` and the `year` it was begun, so the store groups by century as commerce does.
- **The curation can cut part of an original away.** `crop` on a curated work keeps the print and drops the target; the master and every print size come from the crop, and `catalog.json` records it. The Harunobu now stops at A3.
- **The editor picks each story's detail** in the CMS, a point and a zoom; a story without one shows the whole print. The journal lists stories newest first and has no pages of its own: each card leads to its print's page, where the story already is (`#story`).
- **Collections are the editor's curations**, not commerce's taxonomy, which stays for the dashboard and the gateway's `collections`. The front page's own selection is not listed.
- **Two list tags join the vocabulary**: `curations` and `stories`. A curation or a story added or removed is in no cached page's tags yet; the pages that list them all carry these.
- **A curation holds 24 works at most.** The CMS refuses a 25th, so the gateway prices a curation at a bound rather than a guess. The list of curations asks for each work's picture only, and a curation's page for its tiles. The gateway's tests read every operation under `apps/store/src/gateway/operations` and fail one that costs more than three quarters of the limit, so a page is priced before it ships.
- **Each section's layout marks its place in the menu.** The prints, the collections and the journal have a layout each, and the pages in no section share one in the `(site)` route group. The not-found page brings its own, in no section, since it renders under the root layout alone.

## Consequences

- Every list renders from reads the store already caches, with no request to the gateway per filter or search.
- It holds while the catalogue fits in one page. Past 48 works, filtering, counting and searching move to the gateway, on Vendure's search index and its facet counts; the addresses and the pages stay as they are.
- The search has no stemming or typo tolerance: "etchng" finds nothing. With 48 works and the suggestions on an empty result, that is enough.
- React reveals the streamed part of a page in batches, after the document has loaded, too late for the browser to scroll to `#story`. A client effect on the work's page scrolls there once the story is shown, unless the reader has already scrolled.
- A stack created before this change keeps the old taxonomy, the uncropped scan and stories without details, because the seeds only create. `docker compose down -v` and `up` start it fresh.

## Rejected

- **Vendure's search index through the gateway, with facet counts**: the right engine for a large catalogue, and a second query shape, a reindex on every change and a field per facet for 48 works.
- **Filtering in the browser**: the whole catalogue hydrated into the page, for choices a link already makes without a script.
- **The order by title, the gateway's**: the list would open with "A Girl as a Komuso", "A Party of Merrymakers" and "A Three-Arched Portico". Oldest first reads as a history of the print, and the hero says "from Dürer to Hiroshige".
- **A page per story**: the work's page already shows the story, beside the print it is about and the way to buy it.
- **Reading the route in the header** with `useSelectedLayoutSegment`: Next.js 16 counts it as URL data, so on a work's or a collection's page the header would wait behind a Suspense boundary, and the menu would be marked only after the shell.
- **Dropping the Harunobu**: the crop keeps a print the list was chosen for, at the size its own pixels allow.
