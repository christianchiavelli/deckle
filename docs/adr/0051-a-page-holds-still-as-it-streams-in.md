# 51. A page holds still as it streams in

- Status: accepted
- Date: 2026-10-07
- Versions: Next.js 16.3.8, React 19.3.0
- Scope: `apps/store/src/components/chrome.tsx`, every page's placeholder, `e2e/tests/layout-shift.spec.ts`

## Context

Every page renders on request into a static shell (ADR 0042): the shell holds the chrome and the page's placeholder, and the content streams in after it. React reveals streamed content in batches, so on the stack the content lands about 300 ms after the first paint, even when the server sent all of it within 30 ms. In between, the footer is drawn right under the placeholder, and the content then pushes it off the screen. Measured on the store as item 3 left it, the pages shifted by 0.24 to 0.6 on a laptop and by up to 0.72 on a phone. Google counts a layout shift below 0.1 as good.

## Decision

- **The footer waits for the content.** A page's placeholder is marked `aria-busy="true"`, and while `main` has a busy child the footer is not displayed: `main:has(> [aria-busy='true']) + footer { display: none }`. An element that appears is not a shift; one that moves is. The islands that read in the browser (ADR 0050) mark their waiting state busy the same way, so the footer also waits for the cart or the account.
- **Nothing static sits under a streamed part.** Where a page drew a static band after its streamed content (the note on sizes under the prints, the rules under the scans), the band moves into the same boundary and arrives with it.
- **The drop line keeps its height.** Its placeholder is as tall as the bar: one line on a wide screen, two on a phone, where the words and the link wrap.
- **The fallback font fits Linux too.** Text that paints before Host Grotesk arrives uses Arial resized to its metrics. Linux seldom has Arial, so Liberation Sans, drawn to Arial's metrics, is named after it and takes the same overrides.
- **The e2e suite checks it.** Each page, on a laptop and on a phone, adds up its layout shifts over its first two seconds and must stay under 0.05, half of Google's line: what this record accepts below stays under it, and the footer that jumped, at 0.24 and up, does not.

## Consequences

- On the stack, every page measures between 0 and 0.0004 at both widths. Against the store as item 3 left it, the check fails on every page it had.
- A web font that arrives after the first paint can still wrap a paragraph one line differently, since the fallback matches its metrics on average, not word by word. Before Liberation Sans was named, the CI's Linux runner measured up to 0.04 on a phone.
- Android has neither Arial nor Liberation Sans, so a phone there paints first in Roboto, unadjusted, and can move by a line when Host Grotesk lands.
- For about 300 ms after the first paint, a page shows its header and its heading and nothing under them; the footer comes with the content.
- The rule leans on a convention: a placeholder is busy. A page that forgets passes the build and fails the e2e check.
- Without JavaScript, React never reveals streamed content, so such a page keeps its placeholder and now has no footer either. It had no content without JavaScript before.
- A drop line that takes three lines on a phone, for a drop opening later, still moves the page by one line, about 0.03.

## Rejected

- **Placeholders as tall as the content**: its height is not known until it is read. A cart may be empty or long, and a search may find nothing.
- **Placeholders as tall as the screen**: the footer would start below the fold, but a short page, such as an empty cart or the way in, would pull it up into view as it lands, and that counts as a shift too.
- **The footer in a Suspense boundary of its own**: it would be revealed in the first batch, ahead of slower content, and pushed down again.
