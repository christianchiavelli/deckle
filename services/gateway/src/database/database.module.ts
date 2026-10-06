import {
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Env } from '../config/env.js';
import { DATABASE, PG_POOL } from './database.js';
import { runMigrations } from './migrations.js';

const logger = new Logger('Database');

/** Brings the schema up to date before anything else runs, and closes the pool last. */
@Injectable()
export class DatabaseLifecycle implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onModuleInit() {
    await runMigrations(this.pool, logger);
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const pool = new pg.Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          application_name: 'deckle-gateway',
          max: 10,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30_000,
          keepAlive: true,
        });
        // An idle client that loses its connection emits here; unheard, it would crash the process.
        pool.on('error', (error) => {
          logger.warn(`An idle database connection failed: ${error.message}`);
        });
        return pool;
      },
    },
    {
      provide: DATABASE,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool) => drizzle({ client: pool }),
    },
    DatabaseLifecycle,
  ],
  exports: [PG_POOL, DATABASE],
})
export class DatabaseModule {}
