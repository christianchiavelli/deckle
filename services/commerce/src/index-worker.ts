import { bootstrapWorker, Logger, TransactionalConnection } from '@vendure/core';
import { parseCommerceEnv } from './env.js';
import { HEALTH_TIMEOUT_MS } from './plugins/database-health/database-health.plugin.js';
import { serveWorkerHealth } from './plugins/database-health/database-health.js';
import { logFormat, runProcess } from './process.js';
import { createVendureConfig } from './vendure-config.js';

/**
 * The worker: runs the job queues (search index, collection contents, email, hook
 * delivery) and Vendure's scheduled tasks. It serves nothing; its health endpoint,
 * which pings Postgres, listens on the loopback interface for the container's own
 * healthcheck.
 */
runProcess('worker', async () => {
  const env = parseCommerceEnv(process.env);
  const config = createVendureConfig(env, { process: 'worker', logFormat });
  Logger.useLogger(config.logger ?? Logger.logger);
  const worker = await bootstrapWorker(config);
  await worker.startJobQueue();
  await serveWorkerHealth(worker.app.get(TransactionalConnection), {
    port: env.PORT,
    hostname: '127.0.0.1',
    timeoutMs: HEALTH_TIMEOUT_MS,
  });
});
