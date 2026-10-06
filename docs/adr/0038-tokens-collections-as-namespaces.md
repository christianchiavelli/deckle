# 38. Tokens: Figma's collections as namespaces, checked as they build

- Status: accepted
- Date: 2026-10-06
- Versions: Style Dictionary 5.6.0, Node 24.21 (runs the build from TypeScript source)

## Context

The owner chose the copper plate palette on the contemporary store layout, so its DTCG files became the real tokens (`packages/tokens/tokens`), with no rework. They keep the layout of Figma's native export: one file per collection, and each mode of a collection in a file of its own.

Style Dictionary merges every source file into one tree. In that tree `radius.control` the primitive and `radius.control` the role are the same path, a role aliasing a primitive of the same name points at itself, and the light and dark files define the same paths twice.

## Decision

- **A parser reads each file into the namespace of its collection** (`primitive`, `light`, `dark`, `role`) and points the aliases of the other three at the primitives, as Figma resolves an alias across collections.
- **Four outputs from one platform:** `tokens.css` (primitives as `--p-*`, every semantic colour a `light-dark()` pair, `color-scheme` switched by `data-theme`), `index.js` and `index.d.ts` (semantic and role tokens as typed `var()` strings, primitives left out, so a component cannot reach one), and `foundations.json` for the Storybook pages.
- **The build refuses a broken contract:** a semantic token in one mode only, a token that holds a value instead of aliasing one primitive, two tokens that would reach components under one name, and a colour pair under its contrast floor (7:1 for primary text, 4.5:1 for other text, 3:1 for accents, focus and strong strokes) in either mode.
- **A snapshot of all four outputs** is reviewed with every token change.
- The build is TypeScript run directly by Node 24, with erasable syntax only, so there is no compile step between a token change and its output.

## Consequences

- A designer can export from Figma into `tokens/` and the build either accepts it whole or says which rule it breaks.
- Contrast is a test, not a review step: a palette tweak that drops muted text below 4.5:1 fails CI.
- Dark tokens carry an internal `dark-` name that never reaches the CSS, because Style Dictionary requires unique names.

## Alternatives considered

- **One Style Dictionary run per mode:** the usual answer to modes, but it yields two stylesheets to switch between instead of one `light-dark()` per token, and it cannot see a token missing from one mode.
- **Renaming the colliding paths** (`role-radius-control`): would make the files differ from what Figma exports.
- **Style Dictionary's built-in CSS and JavaScript formats:** they write values, not references, so a component would read a resolved colour and not the semantic variable that switches with the theme.
