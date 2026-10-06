import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appDir = path.dirname(fileURLToPath(import.meta.url));
// pnpm links every package from the store at the repository root, so both the
// standalone trace and Turbopack have to start there, not at this app.
const repositoryRoot = path.resolve(appDir, '../..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repositoryRoot,
  turbopack: { root: repositoryRoot },
  // The repository keeps one AGENTS.md at its root; `next dev` must not write more.
  agentRules: false,
  poweredByHeader: false,
  typedRoutes: true,
  cacheComponents: true,
  // A print nobody has opened yet gets the page's shell at once, then a
  // prerender of its own for the next visitor.
  partialPrefetching: true,
  cacheLife: {
    // What the gateway answers. Its webhooks drop a tag the moment the data
    // changes; the hour only catches a webhook that never arrived.
    gateway: { stale: 30, revalidate: 60 * 60, expire: 60 * 60 * 24 },
  },
  // The design system ships its TypeScript source.
  transpilePackages: ['@deckle/ui'],
  compiler: { styledComponents: true },
};

export default nextConfig;
