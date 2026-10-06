# 39. UI components: typed stories, both themes in every test

- Status: accepted
- Date: 2026-10-06
- Versions: Storybook 10.6.1 (`@storybook/nextjs-vite`, CSF Next), Vitest 5.0.3 with `@vitest/browser-playwright` 5.0.3 and Chromium from Playwright 1.63, eslint-plugin-react-hooks 7.1.1, styled-components 6.6.0-prerelease-20260925231434

## Context

The tokens are built (0038) and Storybook is the showcase (0017). The components come next: the ones on the work's page first, ported from the approved prototype. Each must hold up in light and dark, in English and Portuguese, at desktop and phone width, and render in a Server Component as well as a Client Component.

## Decision

- **`packages/ui` ships TypeScript source**, not a build: the store transpiles it, so there is no compile step between a component and the page that uses it.
- **Stories are written in CSF Next**: `preview.meta()` and `meta.story()`, typed from the preview down to each story's args. A story imports the preview through the package's `#storybook/preview` subpath, and the Vitest addon needs no setup file.
- **Every story renders both themes side by side by default**, each pane with its own `color-scheme`, so the axe audit that fails a story checks contrast in light and dark in one run. Each pane is its own form, so a radio group in one never reaches into the other. Stories that play interactions show one theme, where a role and a name find one element.
- **Components format with pure functions and an explicit `locale`**: money from the minor units commerce keeps, centimetres, ppi. A missing value is a dash with words for screen readers, never a zero. No React context, which a Server Component cannot read.
- **The lint keeps the token contract**: no primitive (`var(--p-*)`) and no written-out colour anywhere in `src` or `.storybook`, and no hand-written `var()` in a component, which reads every value through the typed module. The Storybook chrome takes its hex values from `foundations.json`.
- **CI runs every story in Chromium** (render, interactions, axe) in a job of its own, and `pnpm run build` builds the static Storybook.

## Consequences

- A component that loses contrast in dark mode fails a test, not a review.
- The store passes its locale to the components that format; a forgotten one is a type error.
- CSF Next is a preview feature in Storybook 10.6. The version is pinned, and stories in CSF 3 would hold the same content if it changes course.
- eslint-plugin-jsx-a11y is left out: it does not support ESLint 10, and axe on the rendered DOM of every story covers more, contrast included.

## Alternatives considered

- **CSF 3 with `satisfies Meta<typeof Component>`:** stable, but a meta per file to type by hand and a setup file to keep in step with the preview.
- **A theme toolbar alone:** dark mode would be checked by eye, when someone remembers.
- **Chromatic for visual tests:** a cloud service, and the project stays local.
- **A context provider for the locale:** idiomatic in a client app, unavailable in a Server Component.
