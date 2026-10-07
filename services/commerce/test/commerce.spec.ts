import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogSchema, readCatalog, type Catalog } from '@deckle/met';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import {
  bootstrap,
  bootstrapWorker,
  defaultConfig,
  DefaultLogger,
  JobQueueService,
  LogLevel,
  mergeConfig,
  type VendureConfig,
} from '@vendure/core';
import { SimpleGraphQLClient } from '@vendure/testing';
import { parse } from 'graphql';
import { aroundAll, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../src/database/migrate.js';
import { parseCommerceEnv, type CommerceEnv } from '../src/env.js';
import { CatalogueHooksService } from '../src/plugins/catalogue-hooks/catalogue-hooks.service.js';
import { demoPlan, type DemoFate, type SellableVariant } from '../src/seed/demo-plan.js';
import { isNoOp, seedCommerce, type SeedReport } from '../src/seed/seed-commerce.js';
import { seedDemo, type DemoSeedReport } from '../src/seed/seed-demo.js';
import { createVendureConfig } from '../src/vendure-config.js';
import { freePort, startGatewayStub, type GatewayStub } from './support/gateway-stub.js';

const POSTGRES_IMAGE = 'postgres:18.6-alpine3.24';
const FIXTURE = fileURLToPath(new URL('./fixtures/met', import.meta.url));
const HOOK_SECRET = 'integration-hook-secret';
const GATEWAY_API_KEY = 'deckle-gateway:integration-gateway-api-key-0123456789';
const UNSELLABLE_ID = 999_001;

/**
 * A small demo trade, run three times: in the morning, late the same evening and a day
 * later. Its seed gives every fate an order, and the evening run a new customer and a
 * returning one.
 */
const DEMO_TRADE = { customers: 4, orders: 12, days: 20, seed: 299 };
const DEMO_RUNS = [
  new Date('2026-10-01T06:00:00Z'),
  new Date('2026-10-01T23:00:00Z'),
  new Date('2026-10-02T23:00:00Z'),
] as const;
/** Where the orders stand: the evening run placed the last of them. */
const DEMO_NOW = DEMO_RUNS[1];

/** A directory that removes itself when the scope that made it ends. */
async function temporaryDirectory(prefix: string): Promise<AsyncDisposable & { path: string }> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return { path, [Symbol.asyncDispose]: () => rm(path, { recursive: true, force: true }) };
}

/**
 * The two fixture works (one JPEG, one WebP master), plus a work whose scan is too
 * small to print an A4, which the seed has to pass over.
 */
async function smallDataSet(): Promise<AsyncDisposable & { path: string }> {
  const dir = await temporaryDirectory('deckle-commerce-met-');
  await cp(FIXTURE, dir.path, { recursive: true });
  const catalog: Catalog = catalogSchema.parse(
    JSON.parse(await readFile(join(FIXTURE, 'catalog.json'), 'utf8')),
  );
  const [first] = catalog.works;
  if (!first) {
    throw new Error('The fixture data set is empty');
  }
  const tooSmall = {
    ...first,
    objectId: UNSELLABLE_ID,
    slug: 'too-small-to-print',
    image: { ...first.image, originalWidth: 900, originalHeight: 1200 },
  };
  await writeFile(
    join(dir.path, 'catalog.json'),
    JSON.stringify({ ...catalog, works: [...catalog.works, tooSmall] }),
  );
  return dir;
}

const quiet = (config: VendureConfig): VendureConfig => ({
  ...config,
  logger: new DefaultLogger({ level: LogLevel.Error }),
});

/** What `src/seed.ts` does, in this process: a worker context that writes and exits. */
async function runSeed(config: VendureConfig, catalogDir: string): Promise<SeedReport> {
  const catalog = await readCatalog(catalogDir);
  const { app } = await bootstrapWorker(config);
  try {
    const report = await seedCommerce(app, { catalog, catalogDir, gatewayApiKey: GATEWAY_API_KEY });
    await app.get(CatalogueHooksService).drain();
    return report;
  } finally {
    await app.close();
  }
}

/** What `src/seed.ts` adds when DEMO_DATA is on, in a worker context of its own. */
async function runDemo(config: VendureConfig, now: Date): Promise<DemoSeedReport> {
  const { app } = await bootstrapWorker(config);
  try {
    return await seedDemo(app, now, DEMO_TRADE);
  } finally {
    await app.close();
  }
}

interface Commerce {
  env: CommerceEnv;
  gateway: GatewayStub;
  shop: SimpleGraphQLClient;
  seeds: [SeedReport, SeedReport];
  demos: DemoSeedReport[];
  shopApi: string;
  adminApi: string;
}

let commerce: Commerce;

aroundAll(async (runSuite) => {
  await using postgres = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('commerce')
    .withUsername('commerce')
    .withPassword('commerce')
    .start();
  await using gateway = await startGatewayStub(HOOK_SECRET);
  await using dataSet = await smallDataSet();
  await using assets = await temporaryDirectory('deckle-commerce-assets-');

  const port = await freePort();
  const env = parseCommerceEnv({
    DATABASE_URL: postgres.getConnectionUri(),
    PORT: String(port),
    SUPERADMIN_USERNAME: 'superadmin',
    SUPERADMIN_PASSWORD: 'integration-superadmin-password',
    ASSET_URL_PREFIX: `http://127.0.0.1:${port}/assets/`,
    GATEWAY_JWKS_URL: gateway.jwksUrl,
    GATEWAY_HOOK_URL: gateway.hookUrl,
    HOOK_SECRET,
    GATEWAY_API_KEY,
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1025',
    VENDURE_DISABLE_TELEMETRY: 'true',
  });

  const seedConfig = quiet(
    createVendureConfig(env, {
      process: 'seed',
      provisionGatewayApiKey: true,
      assetsDir: assets.path,
    }),
  );
  await migrateDatabase(seedConfig, env.DATABASE_URL);
  const seeds: [SeedReport, SeedReport] = [
    await runSeed(seedConfig, dataSet.path),
    await runSeed(seedConfig, dataSet.path),
  ];
  const demos: DemoSeedReport[] = [];
  for (const now of DEMO_RUNS) {
    demos.push(await runDemo(seedConfig, now));
  }

  // Vendure's own bootstrap rather than TestServer's: the seed above ran as a worker in
  // this process, and only bootstrap() puts the process back in the server's context
  // (TestServer leaves it as it found it, and the asset server never mounts).
  const serverConfig = quiet(
    createVendureConfig(env, { process: 'server', assetsDir: assets.path }),
  );
  const app = await bootstrap(serverConfig);
  try {
    // The worker's part, done in the server process: indexing, collection filters, hooks.
    await app.get(JobQueueService).start();
    const shopApi = `http://127.0.0.1:${port}/shop-api`;
    commerce = {
      env,
      gateway,
      shop: new SimpleGraphQLClient(mergeConfig(defaultConfig, serverConfig), shopApi),
      seeds,
      demos,
      shopApi,
      adminApi: `http://127.0.0.1:${port}/admin-api`,
    };
    await runSuite();
  } finally {
    await app.close();
  }
}, 300_000);

/** A raw GraphQL call, for headers SimpleGraphQLClient does not send. */
async function graphql(
  url: string,
  query: string,
  headers: Record<string, string> = {},
  variables: Record<string, unknown> = {},
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  });
  const result = (await response.json()) as {
    data?: Record<string, unknown> | null;
    errors?: { message: string; extensions?: { code?: string } }[];
  };
  return { response, ...result };
}

const PRODUCTS = parse(`
  query Products {
    products(options: { sort: { id: ASC } }) {
      items {
        slug
        name
        featuredAsset { preview mimeType }
        facetValues { code facet { code } }
        customFields {
          metObjectId fullTitle artistName artistBio artistNationality artistBeginYear artistEndYear
          objectDate objectBeginYear objectEndYear medium dimensions classification department
          culture period creditLine accessionNumber objectUrl scanWidth scanHeight
        }
        variants {
          sku name price priceWithTax currencyCode
          customFields { paperSize paperWidthCm paperHeightCm imageWidthCm imageHeightCm ppi }
        }
      }
    }
  }
`);

interface ShopProduct {
  slug: string;
  featuredAsset: { preview: string; mimeType: string } | null;
  facetValues: { code: string; facet: { code: string } }[];
  customFields: Record<string, unknown>;
  variants: {
    sku: string;
    price: number;
    priceWithTax: number;
    currencyCode: string;
    customFields: { paperSize: string; ppi: number };
  }[];
}

async function shopProducts(): Promise<ShopProduct[]> {
  const { products } = await commerce.shop.query<{ products: { items: ShopProduct[] } }>(PRODUCTS);
  return products.items;
}

describe('the seed', () => {
  it('builds the shop from the data set, passing over a scan too small to print', () => {
    const [first] = commerce.seeds;
    expect(first.catalogue).toMatchObject({ productsCreated: 2, unsellable: [UNSELLABLE_ID] });
    expect(first.catalogue.variantsCreated).toBeGreaterThanOrEqual(2);
    expect(first.shop).toMatchObject({
      zone: 'created',
      channel: 'updated',
      shippingMethod: 'created',
    });
    expect(first.gatewayApiKey).toBe('created');
  });

  it('finds nothing to do the second time', () => {
    const [, second] = commerce.seeds;
    expect(isNoOp(second)).toBe(true);
    expect(second.catalogue.productsSkipped).toBe(2);
  });
});

describe('the server', () => {
  it('reports itself healthy once Postgres answers', async () => {
    const response = await fetch(commerce.shopApi.replace('/shop-api', '/health'));
    expect([response.status, await response.json()]).toEqual([200, { status: 'ok' }]);
  });
});

describe('the Shop API', () => {
  it("serves each work with The Met's record, and null wherever The Met has nothing", async () => {
    const [melencolia, wave] = await shopProducts();
    expect(melencolia?.slug).toBe('melencolia-i');
    expect(melencolia?.customFields).toMatchObject({
      metObjectId: 336228,
      artistName: 'Albrecht Dürer',
      objectBeginYear: 1514,
      medium: 'Engraving',
      culture: null,
      period: null,
      scanWidth: 2820,
      scanHeight: 3561,
    });
    expect(wave?.customFields).toMatchObject({
      metObjectId: 45434,
      culture: 'Japan',
      period: 'Edo period (1615–1868)',
    });
    expect(wave?.facetValues.map(({ facet, code }) => `${facet.code}:${code}`)).toEqual(
      expect.arrayContaining([
        'artist:katsushika-hokusai',
        'technique:woodblock-prints',
        'edition:open',
      ]),
    );
  });

  it('sells one variant per printable size at the open-edition price, tax included', async () => {
    const prices: Record<string, number> = { A4: 5500, A3: 9000, A2: 14000, A1: 21000 };
    for (const product of await shopProducts()) {
      expect(product.variants.length).toBeGreaterThan(0);
      for (const variant of product.variants) {
        const size = variant.customFields.paperSize;
        expect(variant.sku).toBe(`${String(product.customFields['metObjectId'])}-${size}`);
        expect(variant).toMatchObject({
          price: prices[size],
          priceWithTax: prices[size],
          currencyCode: 'USD',
        });
        expect(variant.customFields.ppi).toBeGreaterThanOrEqual(240);
      }
    }
  });

  it('finds the works through the search index, by collection', async () => {
    const SEARCH = parse(`
      query Search($slug: String!) {
        search(input: { collectionSlug: $slug, groupByProduct: true }) { items { slug } }
      }
    `);
    const slugsIn = async (collection: string) => {
      const { search } = await commerce.shop.query<{ search: { items: { slug: string }[] } }>(
        SEARCH,
        {
          slug: collection,
        },
      );
      return search.items.map(({ slug }) => slug).sort();
    };
    // The index fills as the queue works through the seed's jobs and the collection filters.
    await expect
      .poll(() => slugsIn('all-prints'), { timeout: 30_000, interval: 250 })
      .toEqual(['melencolia-i', 'under-the-wave-off-kanagawa']);
    await expect
      .poll(() => slugsIn('engravings'), { timeout: 30_000, interval: 250 })
      .toEqual(['melencolia-i']);
    await expect
      .poll(() => slugsIn('19th-century'), { timeout: 30_000, interval: 250 })
      .toEqual(['under-the-wave-off-kanagawa']);
  });

  it('serves the masters, WebP included, in the presets the store asks for', async () => {
    const products = await shopProducts();
    expect(products.map(({ featuredAsset }) => featuredAsset?.mimeType)).toEqual([
      'image/jpeg',
      'image/webp',
    ]);
    for (const { featuredAsset } of products) {
      const url = `${featuredAsset?.preview ?? ''}?preset=card&format=webp`;
      const response = await fetch(url);
      expect(response.status, url).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/webp');
    }
    // A size outside the presets gets the default preset, so the cache cannot grow per request.
    const preview = products[0]?.featuredAsset?.preview ?? '';
    const freeForm = await fetch(`${preview}?w=37&h=41`);
    const medium = await fetch(`${preview}?preset=medium`);
    expect(Buffer.from(await freeForm.arrayBuffer())).toEqual(
      Buffer.from(await medium.arrayBuffer()),
    );
    expect((await fetch(`${preview}?preset=poster`)).status).toBe(400);
  });
});

describe('the deckle strategy', () => {
  const AUTHENTICATE = parse(`
    mutation Authenticate($token: String!) {
      authenticate(input: { deckle: { token: $token } }) {
        __typename
        ... on CurrentUser { id identifier }
        ... on InvalidCredentialsError { authenticationError }
      }
    }
  `);
  const ACTIVE_CUSTOMER = parse('query { activeCustomer { id emailAddress } }');

  type AuthenticationResult =
    | { __typename: 'CurrentUser'; id: string; identifier: string }
    | { __typename: 'InvalidCredentialsError'; authenticationError: string };

  it("signs a customer in on the gateway's word, and finds the same one next time", async () => {
    const userId = randomUUID();
    const signIn = async () => {
      const token = await commerce.gateway.signToken(userId);
      const { authenticate } = await commerce.shop.query<{ authenticate: AuthenticationResult }>(
        AUTHENTICATE,
        { token },
      );
      return authenticate;
    };
    const first = await signIn();
    expect(first).toMatchObject({
      __typename: 'CurrentUser',
      identifier: `${userId}@users.deckle.invalid`,
    });
    const { activeCustomer } = await commerce.shop.query<{
      activeCustomer: { emailAddress: string } | null;
    }>(ACTIVE_CUSTOMER);
    expect(activeCustomer?.emailAddress).toBe(`${userId}@users.deckle.invalid`);
    await commerce.shop.asAnonymousUser();
    const second = await signIn();
    expect(second).toMatchObject({
      __typename: 'CurrentUser',
      id: first.__typename === 'CurrentUser' ? first.id : '',
    });
  });

  it('refuses a token the gateway did not sign, and has no login of its own', async () => {
    await commerce.shop.asAnonymousUser();
    const { authenticate } = await commerce.shop.query<{ authenticate: AuthenticationResult }>(
      AUTHENTICATE,
      {
        token: 'not.a.token',
      },
    );
    expect(authenticate).toEqual({
      __typename: 'InvalidCredentialsError',
      authenticationError: 'The token is malformed',
    });
    const native = await graphql(
      commerce.shopApi,
      'mutation { login(username: "superadmin", password: "integration-superadmin-password") { __typename } }',
    );
    expect(native.data?.['login']).toEqual({ __typename: 'NativeAuthStrategyError' });
  });
});

describe('the Admin API', () => {
  it('reads the catalogue with the gateway key, and nothing beyond its role', async () => {
    const key = { 'vendure-api-key': GATEWAY_API_KEY };
    const read = await graphql(commerce.adminApi, '{ products { totalItems } }', key);
    expect(read.data).toEqual({ products: { totalItems: 2 } });
    const administrators = await graphql(
      commerce.adminApi,
      '{ administrators { totalItems } }',
      key,
    );
    expect(administrators.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const wrong = await graphql(commerce.adminApi, '{ products { totalItems } }', {
      'vendure-api-key': 'deckle-gateway:a-key-that-was-never-issued-0123456789',
    });
    expect(wrong.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
  });

  it('keeps the dashboard session in a cookie, never in a header', async () => {
    const login = await graphql(
      commerce.adminApi,
      'mutation { login(username: "superadmin", password: "integration-superadmin-password") { __typename } }',
    );
    expect(login.data?.['login']).toEqual({ __typename: 'CurrentUser' });
    expect(login.response.headers.get('vendure-auth-token')).toBeNull();
    expect(login.response.headers.get('set-cookie')).toMatch(
      /deckle-admin-session=.*httponly.*samesite=strict/i,
    );
  });
});

describe('catalogue hooks', () => {
  it('tell the gateway about every work the seed created, signed', async () => {
    for (const slug of ['melencolia-i', 'under-the-wave-off-kanagawa']) {
      const hook = await commerce.gateway.waitForHook(
        ({ body }) =>
          body.type === 'product' && body.action === 'created' && body.subject['slug'] === slug,
      );
      expect(hook.signatureValid).toBe(true);
      expect(hook.body.source).toBe('commerce');
    }
    await commerce.gateway.waitForHook(
      ({ body }) => body.type === 'collection' && body.action === 'created',
    );
    const ids = commerce.gateway.hooks.map(({ body }) => body.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(commerce.gateway.hooks.every(({ signatureValid }) => signatureValid)).toBe(true);
  });

  it('tell the gateway when a price changes, with the product it belongs to', async () => {
    const key = { 'vendure-api-key': GATEWAY_API_KEY };
    const listed = await graphql(
      commerce.adminApi,
      '{ products(options: { sort: { id: ASC }, take: 1 }) { items { id slug variants { id } } } }',
      key,
    );
    const product = (
      listed.data?.['products'] as {
        items: { id: string; slug: string; variants: { id: string }[] }[];
      }
    ).items[0];
    const variantId = product?.variants[0]?.id ?? '';
    const updated = await graphql(
      commerce.adminApi,
      'mutation ($id: ID!) { updateProductVariants(input: [{ id: $id, price: 5900 }]) { id price } }',
      key,
      { id: variantId },
    );
    expect(updated.errors).toBeUndefined();
    const hook = await commerce.gateway.waitForHook(
      ({ body }) => body.type === 'price' && body.action === 'updated',
    );
    expect(hook.signatureValid).toBe(true);
    expect(hook.body.subject).toEqual({
      productId: product?.id,
      slug: product?.slug,
      variantIds: [variantId],
    });
  });
});

const STATE_OF: Readonly<Record<DemoFate, string>> = {
  'awaiting-shipment': 'PaymentSettled',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

interface DemoOrderRow {
  state: string;
  orderPlacedAt: string;
  createdAt: string;
  customer: { emailAddress: string };
  payments: { state: string; refunds: { state: string }[] }[];
  fulfillments: { state: string }[];
}

/** A query to the Admin API in the superadmin's session, as the dashboard sends it. */
async function asSuperadmin(query: string): Promise<Record<string, unknown> | null | undefined> {
  const login = await graphql(
    commerce.adminApi,
    'mutation { login(username: "superadmin", password: "integration-superadmin-password") { __typename } }',
  );
  const cookie = login.response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
  const { data, errors } = await graphql(commerce.adminApi, query, { cookie });
  expect(errors).toBeUndefined();
  return data;
}

/** Every order, oldest first, as the superadmin sees them in the dashboard. */
async function demoOrders(): Promise<DemoOrderRow[]> {
  const listed = await asSuperadmin(
    `
      {
        orders(options: { sort: { orderPlacedAt: ASC }, take: 100 }) {
          items {
            state
            orderPlacedAt
            createdAt
            customer {
              emailAddress
            }
            payments {
              state
              refunds {
                state
              }
            }
            fulfillments {
              state
            }
          }
        }
      }
    `,
  );
  return (listed?.['orders'] as { items: DemoOrderRow[] }).items;
}

describe('the demo trade', () => {
  it('places each order once, catching up later that day and adding nothing the next', () => {
    expect(commerce.demos).toEqual([
      { customersCreated: 3, ordersPlaced: 10, ordersKept: 0 },
      { customersCreated: 1, ordersPlaced: 2, ordersKept: 10 },
      { customersCreated: 0, ordersPlaced: 0, ordersKept: 12 },
    ]);
  });

  it('holds each planned order, in the state and on the date the plan gives it', async () => {
    const catalogue = await graphql(
      commerce.adminApi,
      '{ products { items { customFields { metObjectId } variants { sku customFields { paperSize } } } } }',
      { 'vendure-api-key': GATEWAY_API_KEY },
    );
    const products = (
      catalogue.data?.['products'] as {
        items: {
          customFields: { metObjectId: number };
          variants: { sku: string; customFields: { paperSize: SellableVariant['size'] } }[];
        }[];
      }
    ).items;
    const plan = demoPlan(
      products.flatMap((product) =>
        product.variants.map((variant) => ({
          sku: variant.sku,
          work: String(product.customFields.metObjectId),
          size: variant.customFields.paperSize,
        })),
      ),
      { ...DEMO_TRADE, now: DEMO_NOW },
    );
    expect(new Set(plan.orders.map((order) => order.fate)).size).toBe(4);

    const orders = await demoOrders();
    expect(orders.map((order) => ({ state: order.state, placedAt: order.orderPlacedAt }))).toEqual(
      plan.orders.map((order) => ({
        state: STATE_OF[order.fate],
        placedAt: order.placedAt.toISOString(),
      })),
    );
  });

  it('refunds what it cancels and ships what it sends, to example addresses only', async () => {
    for (const order of await demoOrders()) {
      expect(order.customer.emailAddress).toMatch(/@example\.com$/);
      expect(Date.parse(order.createdAt)).toBeLessThan(Date.parse(order.orderPlacedAt));
      if (order.state === 'Cancelled') {
        expect(order.payments.flatMap((payment) => payment.refunds)).toEqual([
          { state: 'Settled' },
        ]);
      }
      if (order.state === 'Shipped' || order.state === 'Delivered') {
        expect(order.fulfillments).toEqual([{ state: order.state }]);
      }
    }
  });
});

describe("the dashboard's order chart", () => {
  // Patched: Vendure counted the server's days in UTC and added one; see pnpm-workspace.yaml.
  it("counts the browser's own days, as many as it asked for", async () => {
    const DAY = 86_400_000;
    // A week as a browser in São Paulo, three hours behind UTC, sends it: from its first
    // midnight to the last moment of its seventh day.
    const from = Date.parse('2026-09-25T03:00:00.000Z');
    const data = await asSuperadmin(`
      {
        dashboardMetricSummary(
          input: {
            types: [OrderCount]
            refresh: true
            startDate: "${new Date(from).toISOString()}"
            endDate: "${new Date(from + 7 * DAY - 1).toISOString()}"
          }
        ) {
          entries {
            label
            value
          }
        }
      }
    `);
    const [summary] = data?.['dashboardMetricSummary'] as {
      entries: { label: string; value: number }[];
    }[];

    const orders = await demoOrders();
    const days = [0, 1, 2, 3, 4, 5, 6].map((day) => from + day * DAY);
    const placedOn = (start: number) =>
      orders.filter((order) => {
        const placed = Date.parse(order.orderPlacedAt);
        return placed >= start && placed < start + DAY;
      }).length;
    // Dated at the middle of each day, which the browser prints as that day.
    expect(summary?.entries).toEqual(
      days.map((start) => ({
        label: new Date(start + DAY / 2).toISOString(),
        value: placedOn(start),
      })),
    );
    expect(summary?.entries.some((entry) => entry.value > 0)).toBe(true);
  });
});
