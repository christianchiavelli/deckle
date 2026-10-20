# 60. A print at the size it is shown

- Status: accepted
- Date: 2026-10-20
- Scope: `apps/store/src/views/images.ts`, `packages/ui/src/sections/stage.tsx`, the work's page and the front page

## Context

The first Web Vitals baseline (ADR 0058) put a print's page at 5.51 s of LCP on Lighthouse's slow phone, past Google's 4 s line for poor. Its largest element is the print on its stage, and 4.8 s of that was the file loading: every screen was sent the `page` preset, 1,280 px on its long side, 341 KB for Melencolia I, while a phone draws the print about 240 px wide. On slow 4G it shared the line with the page's scripts, then with the story's detail, which loads the whole master.

## Decision

- **The stage offers the print at two presets, `card` and `page`, in a `srcset`** named by the width each file comes out at: commerce fits a master inside a square, so a print taller than wide comes out narrower than its preset.
- **`sizes` says how wide the print is drawn**, from the grid the work's page and the front page share: square and the page's width on a phone, 7 of 12 columns from `md`, narrowed by the print's proportions when it is taller than wide. `sizes` is read before any CSS, so the numbers are written out; a test holds the layout's widest content to the token that sets it.
- **The print on its stage is fetched first** (`fetchpriority="high"`), on the work's page and the front page, where it is the first screen's picture.
- No new preset: `card` and `page` were already made and cached for every master.

## Consequences

- On the measuring phone, Melencolia I comes as the 507 px `card`, 76 KB, and its LCP falls from 5.51 s to 1.69 s in CI. A phone at 3x still takes `page`, and a laptop at 2x too.
- At 1.75x, `card` is a little softer than `page` when magnified; at its drawn size the two look the same.
- The layout's numbers live in two places, the styles and `stageSizes`. A change to the stage's insets or the grid's columns has to change both; only the widest content is held by a test.

## Alternatives considered

- **A new `phone` preset:** one more file per master in commerce's transform cache, for a size `card` already covers.
- **AVIF:** 54 KB against WebP's 76 KB for the same `card`, at the price of a `<picture>` and a slower first encode; the gain left after the right size is small.
- **Preloading the image:** the image is already in the first bytes of the HTML, where the browser finds it as early as a preload would.
