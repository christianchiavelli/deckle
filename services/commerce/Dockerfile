# syntax=docker/dockerfile:1
#
# Commerce: one image, three commands. Built from the repository root:
#
#   docker build -f services/commerce/Dockerfile -t deckle-commerce .
#
#   server  node dist/index.js          (the default command; /health on $PORT)
#   worker  node dist/index-worker.js   (the job queue; /health on 127.0.0.1:$PORT)
#   seed    node dist/seed.js           (one-shot; migrates, then seeds data/met)

ARG NODE_IMAGE=node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

FROM ${NODE_IMAGE} AS build
ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# pnpm at the version in package.json's packageManager field.
RUN corepack enable
WORKDIR /repo

# The lockfile alone decides what is downloaded, so this layer outlives source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=deckle-pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=deckle-pnpm-cache,target=/root/.cache/pnpm \
    pnpm fetch --store-dir /pnpm/store

# What reaches this COPY is whitelisted by Dockerfile.dockerignore: the commerce
# package, the workspace packages it builds on, and every workspace manifest.
COPY . .
RUN --mount=type=cache,id=deckle-pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=deckle-pnpm-cache,target=/root/.cache/pnpm \
    pnpm install --offline --frozen-lockfile --store-dir /pnpm/store --filter '@deckle/commerce...'
RUN pnpm --filter @deckle/commerce build

# A self-contained copy of the package: `dist` (package.json `files`) and a
# node_modules with production dependencies only, workspace packages included.
# Not offline: deploy checks its own lockfile against the supply-chain policies in
# pnpm-workspace.yaml, which needs the registry's full metadata.
RUN --mount=type=cache,id=deckle-pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=deckle-pnpm-cache,target=/root/.cache/pnpm \
    pnpm --filter @deckle/commerce deploy --prod --store-dir /pnpm/store /deploy \
 && rm -f /deploy/pnpm-lock.yaml /deploy/pnpm-workspace.yaml

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Code and data stay root-owned and read-only to the process; only the asset store
# belongs to the node user. Compose mounts a named volume there; no VOLUME line, so a
# one-off run leaves no anonymous volume behind.
COPY --from=build /deploy ./
COPY data/met/catalog.json data/met/catalog.json
COPY data/met/images data/met/images
RUN mkdir assets && chown node:node assets

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "--enable-source-maps", "dist/index.js"]
