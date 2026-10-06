import { fileURLToPath } from 'node:url';
import { copperFrom, favicon } from '@deckle/brand';
import foundations from '@deckle/tokens/foundations.json' with { type: 'json' };
import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { defineConfig, type Plugin } from 'vite';
import { dashboardTheme } from './src/tools/dashboard-theme.js';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The seal in the accent copper as the tab's icon, where Vendure's would be. */
function deckleFavicon(): Plugin {
  const link = /<link rel="icon"[^>]*>/;
  return {
    name: 'deckle:favicon',
    apply: 'build',
    transformIndexHtml(html) {
      if (!link.test(html)) {
        throw new Error("The dashboard's index.html has no favicon link left to replace");
      }
      // Relative, like every path the dashboard writes: its <base> points at /dashboard/.
      return html.replace(link, '<link rel="icon" type="image/svg+xml" href="favicon.svg" />');
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'favicon.svg',
        source: favicon(copperFrom(foundations.colours)),
      });
    },
  };
}

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
      // Deckle's colours from the token build, and the store's typeface with its
      // metric-matched fallback. The mark on the sign-in page is DashboardBrandPlugin's.
      theme: {
        ...dashboardTheme(foundations),
        additionalStylesheets: fileURLToPath(import.meta.resolve('@deckle/brand/fonts.css')),
      },
    }),
    deckleFavicon(),
  ],
});
