import { fileURLToPath } from 'node:url';
import { AssetServerPlugin, PresetOnlyStrategy } from '@vendure/asset-server-plugin';
import {
  DefaultJobQueuePlugin,
  DefaultLogger,
  DefaultSchedulerPlugin,
  DefaultSearchPlugin,
  defaultShippingEligibilityChecker,
  dummyPaymentHandler,
  LogLevel,
  type VendureConfig,
  type VendureLogger,
} from '@vendure/core';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { withholdSessionTokenHeader } from './auth/admin-session.js';
import { redirectRootTo } from './dashboard-root.js';
import { adminApiKeyStrategy, ProvisionedApiKeyStrategy, splitApiKey } from './auth/api-keys.js';
import {
  orderCustomFields,
  productCustomFields,
  productVariantCustomFields,
} from './catalogue/custom-fields.js';
import { orderReceiptHandler } from './checkout/receipt-email.js';
import { numberedCopiesOnly } from './checkout/shipping-eligibility.js';
import type { CommerceEnv } from './env.js';
import { JsonLogger } from './logging/json-logger.js';
import { migrations } from './migrations/index.js';
import { CatalogueHooksPlugin } from './plugins/catalogue-hooks/catalogue-hooks.plugin.js';
import { hookBackoffMs } from './plugins/catalogue-hooks/hook-delivery.js';
import { CATALOGUE_HOOKS_QUEUE } from './plugins/catalogue-hooks/options.js';
import { DashboardBrandPlugin } from './plugins/dashboard-brand/dashboard-brand.plugin.js';
import { DatabaseHealthPlugin } from './plugins/database-health/database-health.plugin.js';
import { DeckleAuthenticationStrategy } from './plugins/gateway-identity/deckle-authentication-strategy.js';
import { GatewayTokenVerifier } from './plugins/gateway-identity/gateway-token.js';
import { StockShortfallAlarmPlugin } from './plugins/stock-shortfall-alarm/stock-shortfall-alarm.plugin.js';

/** The package root: one level up from both `src/` and `dist/`. */
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

export const paths = {
  /** Uploaded and seeded images and their cached transforms. A Docker volume in compose. */
  assets: `${packageRoot}assets`,
  /** The dashboard's build output, served at `/dashboard`. */
  dashboard: `${packageRoot}dist/dashboard`,
  /** Deckle's email templates: the order confirmation, the only mail it sends, and its partials. */
  emailTemplates: `${packageRoot}templates/email`,
};

export type CommerceProcess = 'server' | 'worker' | 'seed' | 'tool';

export interface ConfigOptions {
  readonly process: CommerceProcess;
  /**
   * The seed passes this to create or rotate the gateway's API key with the value
   * from the environment (see `ProvisionedApiKeyStrategy`).
   */
  readonly provisionGatewayApiKey?: boolean;
  /** JSON lines for container logs, Vendure's coloured text otherwise. */
  readonly logFormat?: 'json' | 'text';
  /** Where images go instead of `paths.assets`; tests and tools use a temporary directory. */
  readonly assetsDir?: string;
}

const SESSION_TOKEN_HEADER = 'vendure-auth-token';

/**
 * Job queues are tables polled by the worker. Vendure's default polls each of them
 * every 200 ms, five queues being some 25 locking queries a second against an idle
 * Postgres. What the store waits for (hooks, the search index, collection contents)
 * is polled every half second; mail and housekeeping every two.
 */
export function queuePollIntervalMs(queueName: string): number {
  switch (queueName) {
    case CATALOGUE_HOOKS_QUEUE:
    case 'update-search-index':
    case 'apply-collection-filters':
      return 500;
    default:
      return 2_000;
  }
}

/**
 * The mail a process sends. The seed's demo trade is history, backdated as it
 * is placed, so it sends none: its 150 or so receipts would also stand in the
 * mail queue, sent one every two seconds, ahead of the first real shopper's.
 */
export function emailHandlers(process: CommerceProcess) {
  return process === 'seed' ? [] : [orderReceiptHandler];
}

function createLogger(options: ConfigOptions): VendureLogger {
  return options.logFormat === 'json'
    ? new JsonLogger({ level: LogLevel.Info, process: options.process })
    : new DefaultLogger({ level: LogLevel.Info });
}

export function createVendureConfig(env: CommerceEnv, options: ConfigOptions): VendureConfig {
  return {
    apiOptions: {
      port: env.PORT,
      adminApiPath: 'admin-api',
      shopApiPath: 'shop-api',
      // Nothing calls these APIs from another origin: the gateway calls from its server,
      // and the dashboard is served from this one. Vendure's default reflects any origin.
      cors: false,
      // Rejects form-encoded and multipart requests that do not carry Apollo's preflight
      // header, which closes login CSRF; the gateway sends JSON, the dashboard the header.
      csrfPrevention: true,
      // The Shop API schema is committed to the repository, so hiding it would hide nothing.
      introspection: true,
      middleware: [
        { route: 'admin-api', handler: withholdSessionTokenHeader(SESSION_TOKEN_HEADER) },
        { route: '/', handler: redirectRootTo('/dashboard/') },
      ],
    },
    authOptions: {
      // Bearer for the Shop API, whose only client is the gateway; cookies for the
      // dashboard; API keys for the gateway on the Admin API. See `admin-session.ts`.
      tokenMethod: ['cookie', 'bearer', 'api-key'],
      authTokenHeaderKey: SESSION_TOKEN_HEADER,
      cookieOptions: {
        name: { shop: 'deckle-shop-session', admin: 'deckle-admin-session' },
        httpOnly: true,
        // The dashboard and the Admin API share an origin, so the cookie never needs to
        // travel with a request started on another site.
        sameSite: 'strict',
      },
      superadminCredentials: {
        identifier: env.SUPERADMIN_USERNAME,
        password: env.SUPERADMIN_PASSWORD,
      },
      // Customers sign in only through the gateway, which vouches for them with a token.
      // Without the native strategy, the Shop API's own login, registration and
      // password-reset mutations answer NativeAuthStrategyError.
      shopAuthenticationStrategy: [
        new DeckleAuthenticationStrategy(
          new GatewayTokenVerifier({ jwksUrl: new URL(env.GATEWAY_JWKS_URL) }),
        ),
      ],
      adminApiKeyStrategy: options.provisionGatewayApiKey
        ? new ProvisionedApiKeyStrategy(splitApiKey(env.GATEWAY_API_KEY))
        : adminApiKeyStrategy(),
    },
    dbConnectionOptions: {
      type: 'postgres',
      url: env.DATABASE_URL,
      synchronize: false,
      migrationsRun: false,
      migrations,
      logging: false,
      applicationName: `commerce-${options.process}`,
    },
    paymentOptions: {
      paymentMethodHandlers: [dummyPaymentHandler],
    },
    shippingOptions: {
      // The flat rate for open editions, and the free method a numbered copy ships by.
      shippingEligibilityCheckers: [defaultShippingEligibilityChecker, numberedCopiesOnly],
    },
    customFields: {
      Product: productCustomFields,
      ProductVariant: productVariantCustomFields,
      Order: orderCustomFields,
    },
    logger: createLogger(options),
    plugins: [
      DefaultJobQueuePlugin.init({
        pollInterval: queuePollIntervalMs,
        backoffStrategy: (queueName, attemptsMade, job) =>
          queueName === CATALOGUE_HOOKS_QUEUE ? hookBackoffMs(attemptsMade, job.id) : 1_000,
        // Below compose's stop grace period, so a job in flight finishes or is put back
        // before Docker kills the worker.
        gracefulShutdownTimeout: 15_000,
      }),
      // Vendure 3.7 ships scheduled tasks of its own (expired sessions, finished jobs,
      // orphaned settings), which only run with a scheduler; it runs them on the worker.
      DefaultSchedulerPlugin.init(),
      DefaultSearchPlugin.init({ indexStockStatus: true, bufferUpdates: false }),
      AssetServerPlugin.init({
        route: 'assets',
        assetUploadDir: options.assetsDir ?? paths.assets,
        assetUrlPrefix: env.ASSET_URL_PREFIX,
        // The masters are 2,400 px on their long side; `zoom` serves them whole,
        // and `thumb` is a search suggestion's, sharp at twice its 44 px.
        presets: [
          { name: 'thumb', width: 160, height: 160, mode: 'resize' },
          { name: 'card', width: 640, height: 640, mode: 'resize' },
          { name: 'page', width: 1280, height: 1280, mode: 'resize' },
          { name: 'zoom', width: 2400, height: 2400, mode: 'resize' },
        ],
        // The asset route is public through Caddy. Free-form sizes would let anyone fill
        // the transform cache on disk; presets cap it at a few files per image.
        imageTransformStrategy: new PresetOnlyStrategy({
          defaultPreset: 'medium',
          permittedFormats: ['jpg', 'webp', 'avif'],
        }),
      }),
      EmailPlugin.init({
        transport: {
          type: 'smtp',
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          // Mailpit speaks plain SMTP on the compose network.
          secure: false,
          ignoreTLS: true,
        },
        // The order confirmation, sent to the address given for the receipt.
        handlers: emailHandlers(options.process),
        templateLoader: new FileBasedTemplateLoader(paths.emailTemplates),
        globalTemplateVars: { fromAddress: '"Deckle" <orders@deckle.invalid>' },
      }),
      DashboardPlugin.init({ route: 'dashboard', appDir: paths.dashboard }),
      DashboardBrandPlugin,
      CatalogueHooksPlugin.init({
        hookUrl: new URL(env.GATEWAY_HOOK_URL),
        secret: env.HOOK_SECRET,
      }),
      StockShortfallAlarmPlugin,
      DatabaseHealthPlugin,
    ],
  };
}
