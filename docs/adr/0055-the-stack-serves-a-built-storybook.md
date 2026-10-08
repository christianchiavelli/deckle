# 55. The stack serves a built Storybook

- Status: accepted
- Date: 2026-10-08
- Versions: Storybook 10.6.1 (`@storybook/nextjs-vite`), Caddy 2.11.6 (`caddy:2.11.6-alpine`, pinned by digest)
- Scope: `packages/ui` (`Dockerfile`, `Caddyfile`), `compose.yaml`, the image and stack jobs in CI, `e2e`

## Context

The spec asks that `docker compose up` also serve the Storybook, so that whoever clones the repository sees the design system next to the store, with nothing installed. Until now it ran only from a checkout, with `pnpm --filter @deckle/ui storybook`, which needs Node, pnpm and every dependency of the design system.

## Decision

- **Storybook is built in an image of its own, `deckle-storybook`, and served as static files.** `packages/ui/Dockerfile` installs the design system and what it builds on, runs `storybook build`, and copies the output into Caddy, the image the front door already uses. Nothing runs Node at request time.
- **The screens bring their data set.** The image copies The Met's catalogue and images, as `data/met` holds them, so the screens show the same works the store sells, from the image's own `/met`.
- **It listens on host port 8083**, after the store (8080), the CMS (8081) and commerce (8082). Port 6006 stays with `storybook dev`, so the stack and a working Storybook can run side by side.
- **CI publishes it with the other images**, tagged by commit, and the stack job checks that its index lists the work page's screen. An e2e test opens it, finds the three groups, and draws a screen with the data set's images and the brand's typeface.

## Consequences

- The image holds a build, not the source: a change shows after `docker compose build storybook`, or once CI has published it. Working on a component stays with `storybook dev`, which reloads as files change.
- The image weighs about 150 MB: Caddy's own 93, then the build and the Met's images, which the commerce image carries as well.
- The built Storybook is not where the stories are tested: `test:stories` runs them in CI, from the source.
- Vite minifies the build's CSS with Lightning CSS, which rewrites the tokens' `light-dark()` for browsers older than its target into variables that only a `color-scheme` in the CSS sets, here `:root`'s. The panes that show a story in both themes switch `color-scheme` inline, which those variables never follow, so the first image drew both panes light, and the Colour page showed each token's light value twice. The build now targets the browsers that read `light-dark()` themselves (`build.cssTarget`), and the e2e checks a pane of each theme; `test:stories` runs unminified, and could not have seen it.

## Rejected

- **`storybook dev` in a container**: a development server, with Node and every dev dependency of the design system in the image, compiling the stories each time it starts.
- **Under the store's origin, at `/storybook`**: the design system would share the shop's origin, its headers and its cookies, and Caddy would need the files from a volume another container fills.
- **A hosted Storybook** (Chromatic, GitHub Pages): a service outside the machine, which the project does without.
