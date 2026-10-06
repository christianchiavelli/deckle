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
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
