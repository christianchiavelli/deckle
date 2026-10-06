import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PluginCommonModule, TransactionalConnection, VendurePlugin } from '@vendure/core';
import { databaseAnswers, writeHealth } from './database-health.js';

/** How long Postgres gets to answer before the check fails. */
export const HEALTH_TIMEOUT_MS = 1_000;

/**
 * Since Vendure 3.6 the server's `/health` answers "ok" without looking at anything.
 * Compose starts the gateway once commerce is healthy, which means little if the
 * database is gone, so this puts a database ping in front of Vendure's own handler:
 * a 503 when Postgres does not answer, Vendure's answer otherwise.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  compatibility: '^3.7.4',
})
export class DatabaseHealthPlugin implements NestModule {
  constructor(private readonly connection: TransactionalConnection) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((_request: IncomingMessage, response: ServerResponse, next: () => void) => {
        void databaseAnswers(this.connection, HEALTH_TIMEOUT_MS).then((healthy) => {
          if (healthy) {
            next();
          } else {
            writeHealth(response, false);
          }
        });
      })
      .forRoutes('health');
  }
}
