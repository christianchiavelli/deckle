import { VendurePlugin } from '@vendure/core';

/**
 * Deckle's mark on the dashboard's sign-in page, where Vendure's logo would be.
 * Nothing runs on the server: the dashboard build finds the extension through
 * `dashboard` and compiles it into the panel. The colours and the typeface are
 * set where the panel is built, in vite.dashboard.config.mts.
 */
@VendurePlugin({
  dashboard: './dashboard/index.tsx',
  compatibility: '^3.7.4',
})
export class DashboardBrandPlugin {}
