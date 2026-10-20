# 58. Web Vitals, measured on the published images

- Status: accepted
- Date: 2026-10-20
- Versions: web-vitals 6.2.3 (attribution build), Playwright 1.63.0
- Scope: `e2e/vitals`, `e2e/playwright.vitals.config.ts`, `.github/workflows/ci.yml`

## Context

CI proved that every page works, passes axe and holds still as it streams in (ADR 0051), and said nothing of how fast it is. A page could put on a second of load or a slow interaction, and every check would pass. Larder, Faultline and Spillway measure their Core Web Vitals in CI against a baseline.

The layout-shift spec checks every page of the store, on a laptop and a phone, at full speed, against a fixed line of 0.05. It catches a page that jumps, not one that is slower than it was.

## Decision

- **A `vitals` job measures LCP, CLS and INP** with web-vitals and its attribution build, in Chrome on the phone and connection of Lighthouse's mobile run: a Moto G Power's screen, a CPU four times slower than the runner's, slow 4G.
- **Four pages, five visits each, as a reader makes them:** the front page, the prints, a print and the search. Each visit arrives cold, waits for the page to hydrate, reads it to the end a screen at a time, then uses it: the menu, a filter, a size and the cart, a maker's name typed a key at a time while the suggestions follow. LCP is read before the first scroll, CLS and INP as the visit ends.
- **Each reading reaches the test as it is reported**, through a binding, marked with the document it was made in. On a phone the menu's links and the prints' filters load a new document, which takes the page's own state with it; the visit still counts the page it came to measure, and not the next one's load.
- **Each metric's median is held against a baseline in the repository** (`e2e/vitals/baseline.json`), and the job fails when one rises past its tolerance: a tenth of LCP or 100 ms, 0.01 of CLS, three tenths of INP or 16 ms, above the noise of GitHub's runners. The table lands in the run's summary, with what each number is about: the element painted, shifted or touched, and where its time went.
- **A baseline comes from CI, never from a laptop**: `pnpm run vitals:accept` takes the median of one or more runs' measurements, writes the baseline and the README's table, and the change is committed like any other. Off CI a measurement is compared, not judged.
- **The stack is the images the run published**, with one gateway, on a runner of its own, never beside the load test. Its data is already fixed: the catalogue is baked into the images from `data/met`, the CMS's starter content is seeded, the demo trade is drawn from a fixed seed (ADR 0041), and the drops open relative to the stack's start. Every run measures the same works, words and orders, and nothing calls The Met.
- **The images job also runs when CI is started by hand on `main`**, so a second run, for a baseline, measures the same commit.
- **The layout-shift spec stays.** It covers every page in both editions and at two widths, at full speed, against an absolute line, and fails a page that throws as it hydrates; the vitals job covers four pages in depth, against what they did before.

## Consequences

- A change that slows a page fails the push that makes it, and says which element and which part of its time.
- The job pulls the five images and starts the stack a second time, beside the stack job, and takes about ten minutes.
- A pull request is not measured, since its images are not published; a slower page shows on the push to `main`.
- The demo trade is placed in the days before the stack's own today, so the numbers do not move with the date.

## Alternatives considered

- **Measuring in the stack job:** a measurement sharing the runner with the browser checks and a thousand claims at once.
- **Lighthouse CI:** a score per page from one load, with no interaction, so no INP, and less to say about what moved.
- **Fixed budgets in place of a baseline:** a limit set once, far above what the pages do, catches nothing until the page is already slow. The layout-shift spec keeps one where an absolute line makes sense.
- **Folding the layout-shift spec into this job:** four pages in place of every page in both editions, and a phone's slow load in place of a check that takes seconds.
