/**
 * Next.js calls `register` once as the production server starts: a bad
 * environment ends the start here, before the first visitor finds out.
 */
export async function register(): Promise<void> {
  if (
    process.env['NEXT_RUNTIME'] !== 'nodejs' ||
    process.env.NODE_ENV !== 'production' ||
    // The build has no runtime secrets, and serves no one.
    process.env['NEXT_PHASE'] === 'phase-production-build'
  ) {
    return;
  }
  const { checkEnvironmentOrExit } = await import('./server-env');
  checkEnvironmentOrExit();
}
