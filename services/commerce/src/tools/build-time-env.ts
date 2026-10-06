import { parseCommerceEnv, type CommerceEnv } from '../env.js';

/**
 * An environment that only satisfies the schema, for the tools that need the config's
 * shape and nothing it connects to: the dashboard build reads its custom fields and
 * plugins, the Shop API schema is printed from a server on an in-memory database.
 * No running service reads it; they parse the real environment and refuse to start
 * without it. The `.invalid` names (RFC 2606) cannot resolve if anything ever tried.
 */
export const buildTimeEnv: CommerceEnv = parseCommerceEnv({
  DATABASE_URL: 'postgres://build:build@database.invalid:5432/build',
  SUPERADMIN_USERNAME: 'build-time-only',
  SUPERADMIN_PASSWORD: 'build-time-only-password',
  ASSET_URL_PREFIX: 'http://assets.invalid/assets/',
  GATEWAY_JWKS_URL: 'http://gateway.invalid/internal/jwks.json',
  GATEWAY_HOOK_URL: 'http://gateway.invalid/hooks/commerce',
  HOOK_SECRET: 'build-time-only-hook-secret',
  GATEWAY_API_KEY: 'build-time:build-time-only-0000000000000000000000000',
  SMTP_HOST: 'smtp.invalid',
  SMTP_PORT: '25',
  VENDURE_DISABLE_TELEMETRY: 'true',
});
