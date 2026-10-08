import type { LoggerService } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AccountStore } from '../../src/accounts/account-store.js';
import { AppModule } from '../../src/app.module.js';
import { DATABASE, PG_POOL } from '../../src/database/database.js';
import { DatabaseLifecycle } from '../../src/database/database.module.js';
import { DropEvents } from '../../src/drops/drop-events.js';
import { DropStore } from '../../src/drops/drop-store.js';
import { WebhookDeliveries } from '../../src/hooks/webhook-deliveries.js';
import { configureHttp } from '../../src/http/configure-http.js';
import { SigningKeyStore } from '../../src/identity/signing-key.store.js';
import { PubSub } from '../../src/pubsub/pubsub.js';
import { SessionStore } from '../../src/sessions/session-store.js';
import { CMS_TEST_API_KEY, type FakeUpstreams } from './fake-upstreams.js';
import {
  fakePool,
  InMemoryPubSub,
  InMemorySigningKeyStore,
  InMemoryWebhookDeliveries,
} from './in-memory.js';
import {
  InMemoryAccountStore,
  InMemoryDropStore,
  InMemorySessionStore,
} from './in-memory-accounts.js';

export const TEST_SECRETS = {
  COMMERCE_HOOK_SECRET: 'commerce-hook-secret-for-the-test-suite',
  CMS_HOOK_SECRET: 'cms-hook-secret-for-the-test-suite-only',
  STORE_REVALIDATE_SECRET: 'store-revalidate-secret-for-the-test-suite',
  GATEWAY_PREVIEW_SECRET: 'gateway-preview-secret-for-the-test-suite',
} as const;

export const PUBLIC_ORIGIN = 'http://localhost:8080';

/** A complete, valid environment pointing at the fake upstreams. */
export function testEnv(upstreams: FakeUpstreams): Record<string, string> {
  return {
    NODE_ENV: 'test',
    PORT: '4000',
    DATABASE_URL: 'postgres://gateway:gateway@127.0.0.1:1/gateway',
    PUBLIC_ORIGIN,
    COMMERCE_SHOP_API_URL: `${upstreams.commerceUrl}/shop-api`,
    COMMERCE_ADMIN_API_URL: `${upstreams.commerceUrl}/admin-api`,
    COMMERCE_API_KEY: 'commerce-api-key-for-the-test-suite',
    CMS_API_URL: `${upstreams.cmsUrl}/api`,
    CMS_API_KEY: CMS_TEST_API_KEY,
    STORE_REVALIDATE_URL: `${upstreams.storeUrl}/api/revalidate`,
    ...TEST_SECRETS,
  };
}

export interface TestAppOptions {
  readonly env: Record<string, string | undefined>;
  readonly healthyDatabase?: boolean;
  readonly logger?: LoggerService | false;
}

/** A gateway listening on a free port, closed by `close()` or `await using`, once. */
export interface ListeningGateway extends AsyncDisposable {
  readonly app: NestExpressApplication;
  readonly url: string;
  close(): Promise<void>;
}

export interface TestApp extends ListeningGateway {
  readonly pubSub: InMemoryPubSub;
  readonly deliveries: InMemoryWebhookDeliveries;
  readonly signingKeys: InMemorySigningKeyStore;
  readonly sessions: InMemorySessionStore;
  readonly accounts: InMemoryAccountStore;
  readonly drops: InMemoryDropStore;
}

/**
 * The whole gateway on a free port, through the same HTTP pipeline as `main.ts`,
 * with Postgres replaced by in-memory stand-ins. The drops the stack opens with
 * are recorded as it starts, as in production.
 */
export async function createTestApp(options: TestAppOptions): Promise<TestApp> {
  for (const [name, value] of Object.entries(options.env)) vi.stubEnv(name, value);

  const pubSub = new InMemoryPubSub();
  const deliveries = new InMemoryWebhookDeliveries();
  const signingKeys = new InMemorySigningKeyStore();
  const sessions = new InMemorySessionStore();
  const accounts = new InMemoryAccountStore();
  const drops = new InMemoryDropStore(new DropEvents(pubSub));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot()] })
    .overrideProvider(PG_POOL)
    .useValue(fakePool(options.healthyDatabase ?? true))
    .overrideProvider(DATABASE)
    .useValue({})
    .overrideProvider(DatabaseLifecycle)
    .useValue({})
    .overrideProvider(PubSub)
    .useValue(pubSub)
    .overrideProvider(WebhookDeliveries)
    .useValue(deliveries)
    .overrideProvider(SigningKeyStore)
    .useValue(signingKeys)
    .overrideProvider(SessionStore)
    .useValue(sessions)
    .overrideProvider(AccountStore)
    .useValue(accounts)
    .overrideProvider(DropStore)
    .useValue(drops)
    .compile();

  return {
    ...(await listen(moduleRef, options.logger)),
    pubSub,
    deliveries,
    signingKeys,
    sessions,
    accounts,
    drops,
  };
}

/**
 * The whole gateway against the real Postgres in `env.DATABASE_URL`: migrations,
 * pub/sub, webhook deliveries and signing keys as in production.
 */
export async function createDatabaseApp(options: TestAppOptions): Promise<ListeningGateway> {
  for (const [name, value] of Object.entries(options.env)) vi.stubEnv(name, value);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot()] }).compile();
  return listen(moduleRef, options.logger);
}

async function listen(
  moduleRef: TestingModule,
  logger: LoggerService | false = false,
): Promise<ListeningGateway> {
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    rawBody: true,
    logger,
  });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  const url = (await app.getUrl()).replace('[::1]', '127.0.0.1');

  // A second close would end the database pool twice, which pg refuses.
  let closing: Promise<void> | undefined;
  const close = () => (closing ??= app.close());
  return { app, url, close, [Symbol.asyncDispose]: close };
}
