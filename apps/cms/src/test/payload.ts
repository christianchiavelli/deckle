import { getPayload, handleEndpoints, type Payload } from 'payload';

export const testSecrets = {
  PAYLOAD_SECRET: 'integration-payload-secret-000000000000000',
  HOOK_SECRET: 'integration-hook-secret-00000000000000000000',
  PREVIEW_SECRET: 'integration-preview-secret-000000000000000',
} as const;

/**
 * Starts Payload the way the production server does: with NODE_ENV set to
 * production, so no schema is pushed and the committed migrations run as it
 * initialises. The config reads its environment when it is first imported,
 * so the variables are set before that.
 */
export async function startPayload(env: {
  databaseUrl: string;
  hookUrl: string;
}): Promise<{ payload: Payload; fetch: typeof fetch }> {
  Object.assign(process.env, {
    ...testSecrets,
    DATABASE_URL: env.databaseUrl,
    GATEWAY_HOOK_URL: env.hookUrl,
    STORE_PREVIEW_URL: 'http://store.test/api/preview',
    PORT: '3000',
    NODE_ENV: 'production',
  });
  const { default: config } = await import('../payload.config');
  const payload = await getPayload({ config });

  // The REST API as Next.js serves it, without a server: Payload's own handler.
  const fetchFromPayload: typeof fetch = (input, init) =>
    handleEndpoints({ config, request: new Request(input, init) });

  return { payload, fetch: fetchFromPayload };
}
