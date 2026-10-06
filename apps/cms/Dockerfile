# syntax=docker/dockerfile:1
# The CMS image: Payload's admin and REST API as a standalone Next.js server.
# Build from the repository root: docker build -f apps/cms/Dockerfile .

ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

FROM ${NODE_IMAGE} AS pnpm
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
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
COPY apps/cms apps/cms
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --store-dir /pnpm/store --filter @deckle/cms...
# The Next.js build traces what the server needs into .next/standalone, which
# is the pruned production tree here (smaller than `pnpm deploy --prod`);
# the same script bundles the seed into dist/seed.mjs.
RUN pnpm --filter @deckle/cms build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/cms/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/cms/.next/static ./apps/cms/.next/static
COPY --from=build --chown=node:node /repo/apps/cms/dist/seed.mjs ./apps/cms/seed.mjs
# Uploads land in /app/apps/cms/media; a fresh named volume mounted there
# takes this directory's owner, so the server can write to it.
RUN mkdir -p /app/apps/cms/media && chown node:node /app/apps/cms/media
WORKDIR /app/apps/cms
USER node
EXPOSE 3000
# Healthy once Payload has started, migrated and reached Postgres.
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --start-interval=2s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# Migrations run as the server starts: see src/instrumentation.ts.
CMD ["node", "server.js"]
