/**
 * Next.js calls `register` once as the production server starts, and stops
 * the process if it throws: a bad environment ends the start there. Payload
 * itself starts with the first request that needs it, so `register` also sends
 * that request, which the server answers as soon as it is ready.
 */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs' || process.env.NODE_ENV !== 'production') {
    return;
  }
  const { startPayloadWhenReady } = await import('./start-up');
  startPayloadWhenReady();
}
