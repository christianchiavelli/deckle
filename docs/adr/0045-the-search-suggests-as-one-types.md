# 45. The search suggests as one types

- Status: accepted
- Date: 2026-10-07
- Versions: Next.js 16.3.8, React 19.3.0, Vendure 3.7.4
- Scope: `packages/ui/src/components/search-field`, `apps/store/src/app/api/suggestions`, `apps/store/src/views/search.ts`, `apps/store/src/views/suggestions.ts`, `apps/store/src/components`, `services/commerce/src/vendure-config.ts`

## Context

The search answered only a search sent with Enter. A shop's search box is expected to answer while one types, with the maker or the print in view before the search is finished, and this one had to keep working without a script, find what the search page finds, and be usable from a keyboard and a screen reader.

## Decision

- **The design system's field becomes a combobox when it is given a source of suggestions**, as the ARIA Authoring Practices draw an editable combobox with a list: focus stays in the field, `aria-activedescendant` names the option the arrow keys reach, Enter opens it or else searches, and Escape closes the list, then clears the field. Each option is a link with `role="option"`, so a click, a middle click and opening in a new tab all work; pressing on the list keeps focus in the field. A polite live region says what the list holds, such as "1 artist and 4 prints".
- **The field owns the timing, the store owns the data.** The field waits for a 120 ms pause, asks only while it is in use and once for each search, from two characters on, and aborts a request a newer one replaces. The store's source is a GET to `/api/suggestions?q=`, checked with `zod/mini` at the border like any other answer. Without a source, or before scripts run, the field is the plain form it was.
- **The route reads the cached catalogue the way the search page does** (ADR 0044) and answers in the store's words: makers, then techniques, then works, three, two and five at most, and last the search page for every result. A maker leads to a search for their name, a technique to the prints page with that filter on, a work to its page.
- **The search page reads its last word as the suggestions do**, as one that may still be being typed, so "melanc" finds _Melencolia I_ in both, and the count the list gives is the page's. This replaces the line in ADR 0044 that kept that reading for suggestions only.
- **A `thumb` preset of 160 px** in commerce's asset server, for the 44 px pictures on a phone's denser screen. The five pictures of a list of Hokusai's prints weigh 24 KB; one `card` of _Knight, Death, and the Devil_ alone weighs 97 KB.
- **The typed part is set a weight heavier**, in the title and in the line below it, which says why each suggestion is there.

## Consequences

- A pause in typing costs one request, about 1.5 KB of JSON, answered from the cached catalogue: nothing reaches the gateway.
- The browser keeps no answer (`no-store`), so a print withdrawn from the shop leaves the suggestions with the next request.
- Keys typed before the header hydrates suggest nothing, and Enter still searches.
- On a phone the header's field is folded into the menu; the search page's own field suggests in the same way.

## Rejected

- **React Aria's or Downshift's combobox**: thorough, and a second way of building components beside the design system's, for one field whose behaviour the ARIA practices spell out and Storybook tests with axe in both themes.
- **The catalogue sent to the browser and searched there**: instant, and every work's record in every page for a list of ten rows; it would also stop working the day the catalogue outgrows one page, where this route would only change what it reads.
- **A Server Function**: a POST, never cached, that Next dispatches one at a time, for a read.
- **A query through the gateway**: the search runs on the store's cached catalogue (ADR 0043), so the gateway would only pass it along.
