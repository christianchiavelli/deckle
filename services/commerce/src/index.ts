import { bootstrap, Logger } from '@vendure/core';
import { migrateDatabase } from './database/migrate.js';
import { parseCommerceEnv } from './env.js';
import { logFormat, runProcess } from './process.js';
import { createVendureConfig } from './vendure-config.js';

/** The server: Shop and Admin APIs, assets, the dashboard and `/health`, on `PORT`. */
runProcess('server', async () => {
  const env = parseCommerceEnv(process.env);
  const config = createVendureConfig(env, { process: 'server', logFormat });
  Logger.useLogger(config.logger ?? Logger.logger);
  // The seed migrates too, and compose may run it first; behind the same advisory lock,
  // whichever comes second finds nothing left to do. The worker never migrates.
  await migrateDatabase(config, env.DATABASE_URL);
  await bootstrap(config);
});
