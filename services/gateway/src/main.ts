import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { configureHttp } from './http/configure-http.js';
import { createGatewayLogger } from './logging/gateway-logger.js';

// The log format is chosen before the environment is validated, so even a refused start logs as JSON.
const logger = createGatewayLogger(process.env['NODE_ENV']);

try {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(), {
    logger,
    // Fail with an error this file can log, instead of Nest aborting the process.
    abortOnError: false,
    // Body parsing is set up in configureHttp: JSON only, size-limited, raw bytes kept for signatures.
    bodyParser: false,
    rawBody: true,
  });
  configureHttp(app);
  // On SIGTERM: Apollo drains in-flight operations and closes subscriptions, then the
  // HTTP server stops, then the database pool and the event listener close.
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);

  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on port ${port}`, 'Bootstrap');
} catch (error) {
  logger.fatal(
    'The gateway could not start',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  process.exit(1);
}
