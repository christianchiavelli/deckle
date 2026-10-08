import { ConfigModule } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { without } from '../../test/support/without.js';
import { envSchema } from './env.js';

const valid = {
  DATABASE_URL: 'postgres://gateway:gateway@postgres:5432/gateway',
  PUBLIC_ORIGIN: 'http://localhost:8080',
  COMMERCE_SHOP_API_URL: 'http://commerce:3000/shop-api',
  COMMERCE_ADMIN_API_URL: 'http://commerce:3000/admin-api',
  COMMERCE_API_KEY: 'local-only-commerce-api-key-not-for-production',
  CMS_API_URL: 'http://cms:3000/api',
  CMS_API_KEY: 'local-only-cms-api-key-not-for-production',
  COMMERCE_HOOK_SECRET: 'local-only-commerce-hook-secret-not-for-production',
  CMS_HOOK_SECRET: 'local-only-cms-hook-secret-not-for-production',
  STORE_REVALIDATE_SECRET: 'local-only-revalidate-secret-not-for-production',
  GATEWAY_PREVIEW_SECRET: 'local-only-gateway-preview-secret-not-for-production',
};

const issuesOf = (env: Record<string, unknown>) =>
  envSchema.safeParse(env).error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('the environment', () => {
  it('fills in the defaults and coerces the port', () => {
    expect(envSchema.parse({ ...valid, PORT: '4100' })).toMatchObject({
      NODE_ENV: 'production',
      PORT: 4100,
    });
    expect(envSchema.parse(valid).PORT).toBe(4000);
  });

  it('requires every secret, with no default for any', () => {
    for (const secret of [
      'COMMERCE_API_KEY',
      'CMS_API_KEY',
      'COMMERCE_HOOK_SECRET',
      'CMS_HOOK_SECRET',
      'STORE_REVALIDATE_SECRET',
      'GATEWAY_PREVIEW_SECRET',
    ] as const) {
      expect(issuesOf(without(valid, secret))).toEqual([secret]);
    }
  });

  it('refuses a secret shorter than the 32 characters every service asks for', () => {
    expect(issuesOf({ ...valid, COMMERCE_HOOK_SECRET: 'x'.repeat(31) })).toEqual([
      'COMMERCE_HOOK_SECRET',
    ]);
    expect(issuesOf({ ...valid, CMS_API_KEY: 'cms-api-key' })).toEqual(['CMS_API_KEY']);
    expect(issuesOf({ ...valid, STORE_REVALIDATE_SECRET: 'x'.repeat(32) })).toEqual([]);
  });

  it('refuses URLs of the wrong kind', () => {
    expect(issuesOf({ ...valid, DATABASE_URL: 'mysql://db/gateway' })).toEqual(['DATABASE_URL']);
    expect(issuesOf({ ...valid, CMS_API_URL: 'cms:3000/api' })).toEqual(['CMS_API_URL']);
    expect(issuesOf({ ...valid, PORT: '70000' })).toEqual(['PORT']);
  });

  it('takes the public origin without a path, and refuses one with', () => {
    expect(
      envSchema.parse({ ...valid, PUBLIC_ORIGIN: 'http://localhost:8080/' }).PUBLIC_ORIGIN,
    ).toBe('http://localhost:8080');
    expect(issuesOf({ ...valid, PUBLIC_ORIGIN: 'http://localhost:8080/store' })).toEqual([
      'PUBLIC_ORIGIN',
    ]);
  });

  it('reads an empty store URL as not set yet', () => {
    expect(
      envSchema.parse({ ...valid, STORE_REVALIDATE_URL: '' }).STORE_REVALIDATE_URL,
    ).toBeUndefined();
    expect(envSchema.parse(valid).STORE_REVALIDATE_URL).toBeUndefined();
  });

  it('stops the start when ConfigModule meets a bad value', async () => {
    for (const [name, value] of Object.entries({ ...valid, DATABASE_URL: 'not a url' })) {
      vi.stubEnv(name, value);
    }

    await expect(
      ConfigModule.forRoot({ ignoreEnvFile: true, validationSchema: envSchema }),
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
