import { RandomBytesApiKeyStrategy, type VendureConfig } from '@vendure/core';
import { describe, expect, it } from 'vitest';
import { ProvisionedApiKeyStrategy } from './auth/api-keys.js';
import { parseCommerceEnv } from './env.js';
import { JsonLogger } from './logging/json-logger.js';
import { migrations } from './migrations/index.js';
import { CATALOGUE_HOOKS_QUEUE } from './plugins/catalogue-hooks/options.js';
import { createVendureConfig, queuePollIntervalMs } from './vendure-config.js';

const env = parseCommerceEnv({
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
});

const pluginNames = (config: VendureConfig) =>
  (config.plugins ?? []).map((plugin) => ('module' in plugin ? plugin.module.name : plugin.name));

describe('createVendureConfig', () => {
  const config = createVendureConfig(env, { process: 'server' });

  it('serves both APIs on the contract paths, to no other origin', () => {
    expect(config.apiOptions).toMatchObject({
      port: 3000,
      adminApiPath: 'admin-api',
      shopApiPath: 'shop-api',
      cors: false,
      csrfPrevention: true,
    });
  });

  it('migrates instead of synchronising the schema', () => {
    expect(config.dbConnectionOptions).toMatchObject({
      type: 'postgres',
      synchronize: false,
      migrationsRun: false,
      migrations,
      applicationName: 'commerce-server',
    });
  });

  it('signs shoppers in through the gateway only', () => {
    const strategies = config.authOptions.shopAuthenticationStrategy ?? [];
    expect(strategies.map(({ name }) => name)).toEqual(['deckle']);
    expect(config.authOptions.tokenMethod).toEqual(['cookie', 'bearer', 'api-key']);
    expect(config.authOptions.cookieOptions).toMatchObject({ httpOnly: true, sameSite: 'strict' });
  });

  it('provisions the gateway key only for the seed', () => {
    expect(config.authOptions.adminApiKeyStrategy).toBeInstanceOf(RandomBytesApiKeyStrategy);
    expect(config.authOptions.adminApiKeyStrategy).not.toBeInstanceOf(ProvisionedApiKeyStrategy);
    const seed = createVendureConfig(env, { process: 'seed', provisionGatewayApiKey: true });
    expect(seed.authOptions.adminApiKeyStrategy).toBeInstanceOf(ProvisionedApiKeyStrategy);
  });

  it('writes JSON lines when asked to', () => {
    expect(
      createVendureConfig(env, { process: 'worker', logFormat: 'json' }).logger,
    ).toBeInstanceOf(JsonLogger);
    expect(config.logger).not.toBeInstanceOf(JsonLogger);
  });

  it('runs the React dashboard, never the Angular admin', () => {
    const names = pluginNames(config);
    expect(names).toEqual(
      expect.arrayContaining([
        'DefaultJobQueuePlugin',
        'DefaultSchedulerPlugin',
        'DefaultSearchPlugin',
        'AssetServerPlugin',
        'EmailPlugin',
        'DashboardPlugin',
        'CatalogueHooksPlugin',
        'StockShortfallAlarmPlugin',
      ]),
    );
    expect(names).not.toContain('AdminUiPlugin');
  });

  it('keeps the museum record read-only and nullable, and the print sizes editable', () => {
    const product = config.customFields?.Product ?? [];
    expect(product.length).toBeGreaterThan(0);
    for (const field of product) {
      expect(field, field.name).toMatchObject({ nullable: true, readonly: true });
      expect(field.public, field.name).not.toBe(false);
    }
    expect(product.find(({ name }) => name === 'metObjectId')).toMatchObject({
      type: 'int',
      unique: true,
    });
    const variant = config.customFields?.ProductVariant ?? [];
    expect(variant.map(({ name }) => name)).toEqual([
      'paperSize',
      'paperWidthCm',
      'paperHeightCm',
      'imageWidthCm',
      'imageHeightCm',
      'ppi',
    ]);
    expect(variant.every((field) => field.readonly !== true)).toBe(true);
  });
});

describe('queuePollIntervalMs', () => {
  it('polls what the store waits for every half second, the rest every two', () => {
    expect(queuePollIntervalMs(CATALOGUE_HOOKS_QUEUE)).toBe(500);
    expect(queuePollIntervalMs('update-search-index')).toBe(500);
    expect(queuePollIntervalMs('apply-collection-filters')).toBe(500);
    expect(queuePollIntervalMs('send-email')).toBe(2_000);
  });
});
