# 5. TypeScript 6.0 across the monorepo

- Status: accepted
- Date: 2026-10-05

## Context

TypeScript 7.0, the native port, is the latest release. The NestJS CLI refuses it, and typescript-eslint supports TypeScript only up to 6.0.

## Decision

TypeScript is pinned to **6.0.3** in every package, through the pnpm catalog.

## Consequences

- One compiler for the whole repository, and lint rules that understand it.
- TypeScript 6 changed defaults: `strict` is on, `module` is `esnext`, and `types` is empty, so every tsconfig names its `types` and its `rootDir` explicitly.
- Options TypeScript 6 deprecates, such as `baseUrl` and `moduleResolution: node10`, are not used, since 7.0 removes them. The move to 7.0 waits for the Nest CLI and typescript-eslint.

## Alternatives considered

- **TypeScript 7.0 for the packages that accept it:** two compilers in one repository, and the lint would not run on half of it.
