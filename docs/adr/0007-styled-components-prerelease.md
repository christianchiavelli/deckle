# 7. A styled-components prerelease

- Status: accepted
- Date: 2026-10-05

## Context

The store renders with React Server Components and streams, so a component can first render inside a Suspense fallback and then again in the content that replaces it. styled-components 6.5.3, the stable release, loses that component's CSS when the fallback is swapped for the content (issue #5808). The fix is merged (PR #5815) and published only as a prerelease.

## Decision

- styled-components is pinned to **`6.6.0-prerelease-20260925231434`**.
- It goes back to the stable release when **6.6.0** ships.
- An end-to-end test keeps checking that the CSS survives the swap from fallback to content, so the move back cannot reintroduce the bug unnoticed.

## Consequences

- A prerelease in production code, with the reason and the way out written down.
- styled-components keeps requirements in a Server Components app: a registry with `useServerInsertedHTML` for Client Components during SSR, `compiler.styledComponents` in the Next config, theming through CSS variables (a `ThemeProvider` does nothing in a Server Component), global CSS in a `.css` file rather than `createGlobalStyle`, and `stylisPluginRSC` once a style uses `:first-child` or `:nth-child`.

## Alternatives considered

- **6.5.3 with the affected components kept out of Suspense:** a design constraint to hide a library bug.
- **A different styling library:** styled-components is part of what the role asks for.
