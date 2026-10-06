import { describe, expect, it } from 'vitest';
import { apiKeySchema, InvalidEnvironmentError, parseCommerceEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgres://commerce:commerce@postgres:5432/commerce',
  SUPERADMIN_USERNAME: 'superadmin',
  SUPERADMIN_PASSWORD: 'a-long-local-password',
  ASSET_URL_PREFIX: 'http://localhost:8080/assets/',
  GATEWAY_JWKS_URL: 'http://gateway:4000/internal/jwks.json',
  GATEWAY_HOOK_URL: 'http://gateway:4000/hooks/commerce',
  HOOK_SECRET: 'local-only-hook-secret',
  GATEWAY_API_KEY: 'deckle-gateway:local-only-gateway-api-key-0123456789abcdef',
  SMTP_HOST: 'mailpit',
  SMTP_PORT: '1025',
  VENDURE_DISABLE_TELEMETRY: 'true',
};

/** The message of the one error a bad environment produces. */
function errorFor(source: Record<string, string | undefined>): string {
  try {
    parseCommerceEnv(source);
  } catch (error) {
    if (error instanceof InvalidEnvironmentError) {
      return error.message;
    }
    throw error;
  }
  throw new Error('expected the environment to be refused');
}

describe('parseCommerceEnv', () => {
  it('reads a complete environment, with ports as numbers and 3000 by default', () => {
    const env = parseCommerceEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.SMTP_PORT).toBe(1025);
    expect(parseCommerceEnv({ ...valid, PORT: '3100' }).PORT).toBe(3100);
  });

  it('accepts both spellings of the Postgres scheme', () => {
    const url = 'postgresql://commerce:commerce@postgres/commerce';
    expect(parseCommerceEnv({ ...valid, DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('requires every secret, since only compose may give them a value', () => {
    const message = errorFor({
      ...valid,
      SUPERADMIN_PASSWORD: undefined,
      HOOK_SECRET: undefined,
      GATEWAY_API_KEY: undefined,
    });
    expect(message).toContain('SUPERADMIN_PASSWORD');
    expect(message).toContain('HOOK_SECRET');
    expect(message).toContain('GATEWAY_API_KEY');
  });

  it("refuses Vendure's default password and short secrets", () => {
    expect(errorFor({ ...valid, SUPERADMIN_PASSWORD: 'superadmin' })).toContain(
      'SUPERADMIN_PASSWORD',
    );
    expect(errorFor({ ...valid, HOOK_SECRET: 'short' })).toContain('16 characters');
  });

  it('refuses an asset prefix without a trailing slash and a database that is not Postgres', () => {
    expect(errorFor({ ...valid, ASSET_URL_PREFIX: 'http://localhost:8080/assets' })).toContain(
      'slash',
    );
    expect(errorFor({ ...valid, DATABASE_URL: 'mysql://commerce@db/commerce' })).toContain(
      'DATABASE_URL',
    );
  });

  it('refuses to start with telemetry left on', () => {
    expect(errorFor({ ...valid, VENDURE_DISABLE_TELEMETRY: undefined })).toContain(
      'never sends telemetry',
    );
    expect(errorFor({ ...valid, VENDURE_DISABLE_TELEMETRY: 'false' })).toContain(
      'VENDURE_DISABLE_TELEMETRY',
    );
  });

  it('refuses a port out of range', () => {
    expect(errorFor({ ...valid, PORT: '70000' })).toContain('PORT');
  });
});

describe('apiKeySchema', () => {
  it("takes Vendure's <lookup id>:<secret> form", () => {
    expect(apiKeySchema.safeParse(valid.GATEWAY_API_KEY).success).toBe(true);
  });

  it.each([
    ['no separator', 'deckle-gateway-local-only-gateway-api-key-0123456789abcdef'],
    ['a short secret', 'deckle-gateway:too-short'],
    ['a short lookup id', 'gw:local-only-gateway-api-key-0123456789abcdef'],
    ['a second colon', 'deckle-gateway:local-only:gateway-api-key-0123456789abcdef'],
  ])('refuses a key with %s', (_case, key) => {
    expect(apiKeySchema.safeParse(key).success).toBe(false);
  });
});
