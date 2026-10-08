# syntax=docker/dockerfile:1
# The design system's Storybook, built once and served as static files.
# Build from the repository root: docker build -f packages/ui/Dockerfile .

ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
ARG CADDY_IMAGE=caddy:2.11.6-alpine@sha256:d44355d3c2149dc580ce2cac735955d1c08d3d00882c30489c241aa51a5c10d9

FROM ${NODE_IMAGE} AS pnpm
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    STORYBOOK_DISABLE_TELEMETRY=1
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY patches/ patches/
# pnpm at the exact version and checksum `packageManager` names.
RUN corepack enable pnpm && corepack install

FROM pnpm AS build
# Downloads depend on the lockfile alone, so this layer outlives source edits.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store
COPY tsconfig.base.json ./
COPY packages/eslint-config packages/eslint-config
COPY packages/tokens packages/tokens
COPY packages/brand packages/brand
COPY packages/print-sizes packages/print-sizes
COPY packages/ui packages/ui
# The screens are drawn from the real data set: its catalogue, and its images as /met.
COPY data/met/catalog.json data/met/catalog.json
COPY data/met/images data/met/images
# Not --offline: when CI's cache restores the fetch layer without running it,
# the store mount holds no registry metadata, which pnpm checks the lockfile against.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prefer-offline --frozen-lockfile --store-dir /pnpm/store --filter @deckle/ui...
RUN pnpm --filter @deckle/ui build

FROM ${CADDY_IMAGE} AS runtime
COPY packages/ui/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/packages/ui/storybook-static /srv
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --start-interval=2s --retries=3 \
    CMD ["wget", "--quiet", "--spider", "http://127.0.0.1/healthz"]
