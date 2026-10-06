import { fileURLToPath } from 'node:url';
import { readCatalog } from '@deckle/met';
import { bootstrapWorker, Logger } from '@vendure/core';
import { migrateDatabase } from './database/migrate.js';
import { parseCommerceEnv } from './env.js';
import { CatalogueHooksService } from './plugins/catalogue-hooks/catalogue-hooks.service.js';
import { logFormat, runProcess } from './process.js';
import { isNoOp, seedCommerce } from './seed/seed-commerce.js';
import { createVendureConfig } from './vendure-config.js';

/**
 * `data/met` at the root of the repository; the image keeps the same layout. A path
 * given as the first argument replaces it.
 */
/**
 * The data set baked into the image next to `dist/`. In the repository, the package's
 * `seed` script passes the root's `data/met` instead.
 */
const defaultCatalogDir = fileURLToPath(new URL('../data/met', import.meta.url));

/** The seed: a one-shot that makes the database hold the data set, and exits 0. */
runProcess('seed', async () => {
  const env = parseCommerceEnv(process.env);
  const catalogDir = process.argv[2] ?? defaultCatalogDir;
  const catalog = await readCatalog(catalogDir);
  const config = createVendureConfig(env, {
    process: 'seed',
    logFormat,
    provisionGatewayApiKey: true,
  });
  Logger.useLogger(config.logger ?? Logger.logger);
  // In compose the server has migrated before the seed starts; run by hand against a
  // fresh database, the seed brings the schema up itself (a no-op otherwise).
  await migrateDatabase(config, env.DATABASE_URL);

  // The worker context gives every Vendure service without serving anything; the job
  // queue is not started here, so the real worker does the work the seed enqueues.
  const { app } = await bootstrapWorker(config);
  try {
    const report = await seedCommerce(app, {
      catalog,
      catalogDir,
      gatewayApiKey: env.GATEWAY_API_KEY,
    });
    Logger.info(
      isNoOp(report)
        ? `Nothing to seed: the ${catalog.works.length} works are already in the shop`
        : `Seeded: ${JSON.stringify(report)}`,
      'Seed',
    );
    // The hooks for what the seed wrote are still in memory; they go to the queue now.
    await app.get(CatalogueHooksService).drain();
  } finally {
    await app.close();
  }
});
