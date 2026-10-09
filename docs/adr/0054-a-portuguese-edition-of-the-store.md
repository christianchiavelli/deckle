# 54. A Portuguese edition of the store

- Status: accepted
- Date: 2026-10-08
- Versions: Next.js 16.3.8, Payload 3.90.2 (`@payloadcms/db-postgres` 3.90.2), NestJS 12.1.2, styled-components 6.6.0-prerelease-20260925231434 (ADR 0007)
- Scope: `apps/store` (`app/[lang]`, `src/proxy.ts`, `src/copy`), `services/gateway` (the request's language), `apps/cms` (localized fields, a migration, the seed), `e2e`

## Context

The owner asked for the store in Brazilian Portuguese. A page carries three kinds of words: the store's own, from its copy; the CMS's, which an editor writes (stories, collections, drop pages); and the museum's (titles, makers, dates, the record), which The Met publishes in English only. Each needed its own answer, and English had to stay where it was: at the root of every address, with nothing a reader or a search engine already holds changed.

## Decision

- **Two editions, two addresses.** English stays at the root; Portuguese lives under `/pt-br`, named for the variant its copy is written in. Every page sits under `app/[lang]`, whose layout is the root layout and sets `<html lang>`. The proxy rewrites an English address to its `/en` route, answers `/en/...` with a 308 to the address without the prefix, and names both editions of every page in a `Link` header, `hreflang` `en`, `pt-BR` and `x-default` (English). Both editions are prerendered.
- **The address chooses the edition, never the browser.** No redirect on `Accept-Language` or a cookie: an address shows the same page to everyone, is cached once, and opens in the sender's language when shared.
- **The header switches between them, `EN | PT`**, the design the owner chose from three in Storybook because it shows both at once: two letters each, the current one underlined in copper as the menu marks its section, and on a phone a row of its own in the menu. Each link leads to the same page in the other edition, query kept, and a screen reader hears each language's name, said in that language. A page's shell is built before a work's slug is known, so the server's links ask `/api/edition?to=`, which sends the browser to the same page in that edition from the address its `Referer` names, with no script needed; in the browser the same links point straight there, and a click adds the anchor. A page that is not there switches to the front pages.
- **The store's words live in `apps/store/src/copy`**, one module per edition. The Portuguese one is typed as the English one's shape, so a missing or extra word fails the types, and a word that needs numbers is a function (`gravuras(3)`, `Intl.ListFormat` for "1 artista e 4 gravuras"). Server Components read `getCopy()`, which takes the edition from `next/root-params`; the browser's islands read `useCopy()`, from a provider in the root layout. Every link inside the store goes through `copy.path()`. Cached reads of the CMS's words take the edition as an argument, so `'use cache'` keeps each apart, under the same tags: one webhook drops both.
- **The CMS's words are localized in Payload.** `en`, the default, and `pt`, with fallback on. Localized: a story's title, lede and body; a collection's title and intro; a drop page's headline and body. Slugs, sources, the detail's crop and the works chosen stay one per document, so a document has one draft, one publish and one preview in both languages. The migration copies the existing text into the new `_locales` tables as English before it drops the old columns, and `down` copies it back. The seed writes both languages: it creates the English as a draft and publishes once with the Portuguese, so the gateway hears one event per document, and it adds the Portuguese to an existing document that lacks it, unless an editor has a draft pending.
- **The gateway reads the CMS in the request's language.** It weighs `Accept-Language` by its `q` values and reads Portuguese when `pt` outranks `en`, English otherwise, with `locale=pt&fallback-locale=en`, so a field nobody translated reads in English rather than empty. The store's server names the page's edition with every read; its Apollo client in the browser names the page's, whatever the browser's own setting. Subscriptions carry no CMS words and read English.
- **A preview opens the language being edited.** The CMS's preview and live preview links carry `&locale=pt` when the editor is in Portuguese, and the store opens the Portuguese edition.
- **The museum's words stay the museum's.** Titles, makers, dates, mediums and the record are The Met's, in English, and a Portuguese page marks them `lang="en"` where it shows them, so a screen reader says them as English. The technique families the store filters by are the store's own words: they read in Portuguese (Águas-fortes, Litografias), the search finds a print by either name, and the filters' addresses stay one for both editions (`?technique=etchings`). Centuries read in Roman numerals, as Portuguese writes them.
- **Formats follow the edition.** Prices stay in dollars, which commerce sells in, written `US$ 90`; dates `8 de out. de 2026`; numbers `2.820`; and countries are named in the edition's language from their codes (`Intl.DisplayNames`), at checkout and on the order.
- **An address no page answers is a 404 in its own edition.** `app/[lang]/[...missing]` calls `notFound()` for anything the routes miss.

## Consequences

- Every page is prerendered twice, and the build and the image grow with it.
- The receipt is written by commerce in English, whatever edition the order was placed in. Two sets of templates in Vendure's email plugin, and the order's language kept to choose between them, are left for later. ADR 0057 writes it in the order's language.
- Next 16 renders a page's `notFound()` as a recovery shell, which the browser fills from the page's payload: an unknown address answers 404 in its edition's words, but only once scripts run. Before, `app/not-found.tsx` at the root made it a static page, a route Next cannot build once the root layout sits under `[lang]`.
- A story's title in Portuguese can name a work its record names in English ("São Jerônimo em seu gabinete" beside "Saint Jerome in His Study").
- The journal puts the story edited last first, so translating a story moves it up, in both editions.
- Portuguese runs about a fifth longer. Every page was compared with its English at a laptop's and a phone's width, in both themes; two labels were shortened to fit as the English does, and the layout-shift e2e measures four Portuguese pages.
- styled-components keeps `StyleSheetManager`'s plugins in module state in Server Components. Once the chrome awaited its edition, its `main` was written without `stylisPluginRSC` in one render and with it in another, and React drew the page again as it hydrated: the footer jumped. The footer's rule is plain CSS in `store.css` now, which no plugin rewrites, and the layout-shift e2e fails a page that throws as it hydrates.

## Rejected

- **One address, the edition chosen by `Accept-Language` or a cookie**: the cache would have to vary by it, a search engine would see one language, and a shared link would open in the reader's language rather than the sender's.
- **Portuguese at `/pt`, or on a subdomain**: `/pt` would claim a Portuguese the copy is not written in, and a subdomain would be a second origin, with passkeys bound to the first (ADR 0011).
- **A translation library** (next-intl, i18next): two editions of typed objects do what message catalogues would, and keep the type check of every argument a catalogue's strings lose.
- **Translated titles for the works**: The Met publishes none, and an invented one would match neither the record nor a search on metmuseum.org.
- **A second document per language in the CMS**: two slugs to keep in step, two drafts, two publish events; Payload's localized fields keep one document.
- **`app/global-not-found.tsx` for unknown addresses**: it renders outside `[lang]`, in one language for both editions.
- **The other language's name alone** ("Português" on the English pages) and **a globe that opens a menu of languages**: the two switches compared with the chosen one. The name says where it goes but not where the reader is; the menu hides both behind a click.
- **Reading the address with `usePathname`** for the switch's links: Next 16 counts it as URL data, so on a work's page the switch would wait behind a Suspense boundary and be drawn again as the address arrived, losing a click made in between.
