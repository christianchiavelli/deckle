import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withPayload } from '@payloadcms/next/withPayload';
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
  // The app has no pages of its own: the root is the admin.
  redirects: () => Promise.resolve([{ source: '/', destination: '/admin', permanent: false }]),
  experimental: {
    // Every port of localhost shares one cookie jar, so the store's draft-mode cookie
    // reaches the admin too, and Next would clear it as a draft of an older build:
    // the live preview would drop back to what is published at the first autosave.
    multiZoneDraftMode: true,
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
