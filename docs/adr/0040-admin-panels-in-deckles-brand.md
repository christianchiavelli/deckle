# 40. The admin panels wear Deckle's brand, from the same tokens

- Status: accepted
- Date: 2026-10-06
- Versions: Vendure 3.7.4 (`@vendure/dashboard`, on Tailwind 4.3.3 and the shadcn keys of `@vendure-io/design-tokens` 1.2.0), Payload 3.90.2 on Next.js 16.3.8, React 19.3.0, TypeScript 6.0.3

## Context

The editors work in two panels the store does not draw: Payload's admin on 8081 and Vendure's dashboard on 8082. Both shipped in their makers' colours, type and marks, so moving between the store and its back office meant moving between three brands. The store's look is settled (0038, 0039) and its mark chosen (`design/logo`). The panels should wear the same, without a copy of a single value and without patching either framework for looks.

## Decision

- **A `packages/brand` holds what every surface shares**: the seal's outline, the favicon drawn from it, and the Host Grotesk files with their metric-matched fallback. It has no framework and imports no data: the favicon takes the copper from whoever calls it, which reads the token build. The store's components and Storybook take the seal from it, and so do both panels.
- **Vendure's dashboard takes its theme from the token build.** `dashboardTheme()` fills each of the dashboard's colour keys, shadcn's and Vendure's own, from a semantic token, per theme where elevation runs the other way on ink. The fonts reach it through `additionalStylesheets`, the favicon through a small Vite plugin that fails the build if the dashboard's own link is gone, and the mark on the sign-in page through `DashboardBrandPlugin`, a dashboard extension.
- **The extension is typed against the part of the API it calls.** `@vendure/dashboard` ships that API as source for its own build to compile, without declarations, and checking its thousand files under this repository's settings fails on code that is not ours. A declaration of `defineDashboardExtension` with the documented login shape stands in for the type check; the build links the real module, and the e2e check sees the mark. React is a dev dependency of commerce only so the extension's JSX resolves to the dashboard's own copy, the version the catalog pins.
- **Payload's admin is themed through the variables Payload documents, never selectors into its components.** Its grey scale, which it mirrors for dark mode, is redrawn on the paper and bistre primitives of the same lightness, so its contrasts hold and the light theme's surfaces are the store's own. Its success colour, its blue for saved and checked, is turned to Deckle's green at the same lightness and chroma. `color-scheme` follows Payload's `data-theme`, which Deckle's `light-dark()` tokens need. The mark replaces Payload's graphics, the favicon is a static route drawn by the same function, and the admin's preview cards are off.
- **Each panel keeps its maker's credit and its own words.** Vendure's "Powered by" mark stays under the sign-in form, as its licence asks, and both panels keep their titles and copy.

## Consequences

- A change to a token reaches the store, Storybook and both panels in their next build.
- The e2e checks sign in under Deckle's mark, the favicon and the typeface on both panels, against the published images.
- The declaration of the dashboard's extension API has to follow Vendure's upgrades; a change it misses shows as a missing mark, which the e2e check catches.
- Inside Vendure's app the brand is colour and type only: the dashboard has no slot for a mark beside its menu, and a patch for looks would not be a fix.
- Host Grotesk sets wider than the dashboard's own face. The one fixed-width control that overflowed with it, the insights page's date range in Portuguese, is patched to grow with its text (`pnpm-workspace.yaml`).
- Host Grotesk's one contextual alternate draws an x between figures as ×, so an order code such as `…1X67` read as `…1×67` in the dashboard. `fonts.css` turns contextual alternates off on every surface that loads the face; a × that is meant is typed as one.
- Copper shows in the panels where it shows in the store: the mark, focus, and the open section of Vendure's menu.

## Alternatives considered

- **Hex values copied into each panel's config:** quick, and stale the first time a token moves.
- **Copper as Payload's success colour:** its tint is indistinguishable from Payload's orange warnings in a toast.
- **Checking the dashboard's source with relaxed compiler settings**, as Vendure's guide suggests: six errors remain in Vendure's code under TypeScript 6, and every check reads a thousand files.
- **A patch to put the seal in Vendure's sidebar:** `pnpm patch` here is for bugs, and this one would have to be redone on every upgrade.
