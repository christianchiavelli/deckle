import { fileURLToPath } from 'node:url';
import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The React dashboard, built into `dist/dashboard` and served by DashboardPlugin at
 * `/dashboard` on the server's own origin. Vendure's plugin compiles the config
 * named below to read custom fields and plugins, and builds the Admin API schema
 * from them; no server or database is needed.
 */
export default defineConfig({
  base: '/dashboard/',
  build: {
    outDir: here('./dist/dashboard'),
    emptyOutDir: true,
  },
  plugins: [
    vendureDashboardPlugin({
      vendureConfigPath: new URL('./src/tools/dashboard.vendure-config.ts', import.meta.url),
      // The config and everything it imports are ES modules (`import.meta` included).
      module: 'esm',
      tempCompilationDir: here('./node_modules/.cache/vendure-dashboard-temp'),
      // The server's tokenMethod includes bearer for the Shop API; left to infer, the
      // dashboard would pick bearer too and keep its session in localStorage.
      api: { host: 'auto', port: 'auto', tokenMethod: 'cookie' },
    }),
  ],
});
