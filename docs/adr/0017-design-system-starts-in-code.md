# 17. The design system starts in code

- Status: accepted
- Date: 2026-10-05

## Context

The store needs a design system with the rigour of a real product: layered tokens, a type scale by role, documented components. It must have an identity of its own, not the look of a generated layout. Figma would be the usual home, and it is not free for this.

## Decision

- **Design tokens in DTCG format** (W3C Design Tokens), in the repository, laid out the way **Figma's native export** writes them, so Figma can join later without rework.
- Two layers: **primitives** (palettes, type, space, radius, motion, grid, breakpoints) and **semantic** tokens by role (surface, text, icon, stroke, accent, feedback, focus) in light and dark. A component token exists only for an exception. Components read semantic tokens only, and the lint rejects a primitive used directly.
- **Style Dictionary 5.6** builds CSS variables with `light-dark()`, a typed module for Styled Components and the data for the Foundations pages, with a snapshot test of its output.
- **Storybook 10.6** (`@storybook/nextjs-vite`) is the showcase, with the accessibility addon on every story and the Vitest addon running stories as tests. All local; no Chromatic.
- The **art direction comes from the domain**, a printmaking studio: paper, ink, numbered editions, registration marks. Three directions are compared side by side as static pages before any screen is built (`design/art-direction`), and the chosen token set becomes the real one.

## Consequences

- Design decisions are reviewable as code, and a token change shows up in a diff and a snapshot.
- Without Figma, design happens in the browser, which suits a system built from tokens.
- Fonts are under the SIL Open Font License and served by the app, each with a fallback whose metrics are adjusted so nothing moves when it loads.

## Alternatives considered

- **Figma first:** the usual workflow, behind a paid seat.
- **A component library:** quicker, and the look of every other shop built with it.
