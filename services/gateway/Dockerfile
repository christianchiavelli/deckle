# The gateway. Built from the repository root, which holds the lockfile and the
# workspace packages it compiles against:
#
#   docker build -f services/gateway/Dockerfile -t deckle-gateway .
#
# Migrations run inside the process at start-up, under a Postgres advisory lock,
# so replicas starting together apply them once and the rest wait (docs/adr).

ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

FROM ${NODE_IMAGE} AS build
ENV CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /repo
# pnpm at the version and checksum `packageManager` pins.
COPY package.json ./
RUN corepack enable pnpm && corepack install

# Dependencies first, from the manifests alone, so a source change reuses this layer.
# Scripts wait for the sources: print-sizes compiles itself in `prepare`.
COPY pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches/ patches/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/print-sizes/package.json packages/print-sizes/
COPY services/gateway/package.json services/gateway/
RUN --mount=type=cache,id=deckle-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm/store --filter "@deckle/gateway..."

COPY packages/eslint-config/ packages/eslint-config/
COPY packages/print-sizes/ packages/print-sizes/
COPY services/gateway/ services/gateway/
RUN pnpm --filter "@deckle/gateway..." run build

# A self-contained tree: production dependencies, print-sizes' dist, and the
# gateway's `files` (dist and the migrations).
RUN --mount=type=cache,id=deckle-pnpm-store,target=/pnpm/store \
    pnpm --filter @deckle/gateway deploy --prod --offline --store-dir /pnpm/store /prod/gateway

FROM ${NODE_IMAGE}
ENV NODE_ENV=production PORT=4000
WORKDIR /app
# Owned by root and only readable by the process: it never writes to its own files.
COPY --from=build /prod/gateway ./
USER node
EXPOSE 4000
# Readiness, not liveness: 200 while Postgres answers (upstreams may be degraded), 503 without it.
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --start-interval=2s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# Node is PID 1 and handles SIGTERM itself: Nest drains HTTP, WebSockets and the pools.
CMD ["node", "dist/main.js"]
