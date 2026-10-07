import { type DynamicModule, Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AccountsModule } from './accounts/accounts.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { envSchema } from './config/env.js';
import { CurationsModule } from './curations/curations.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DropsModule } from './drops/drops.module.js';
import { GatewayExceptionFilter } from './graphql/gateway-exception.filter.js';
import { GraphQLApiModule } from './graphql/graphql-api.module.js';
import { HealthModule } from './health/health.module.js';
import { HooksModule } from './hooks/hooks.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { LiveModule } from './live/live.module.js';
import { ShutdownLog } from './logging/shutdown-log.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { StoriesModule } from './stories/stories.module.js';

@Module({})
export class AppModule {
  /**
   * The environment is read and validated when this is called, not when the
   * file is imported, so a test can set it first. A bad value stops the start.
   */
  static forRoot(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          // Compose provides the environment, and `pnpm start` loads .env through
          // Node's --env-file; Nest's own loader stays off, so the image never reads one.
          ignoreEnvFile: true,
          validationSchema: envSchema,
          // Without it, a key the schema parsed to `undefined` (an empty optional URL)
          // falls back to the raw `process.env` string, whatever its inferred type says.
          skipProcessEnv: true,
        }),
        DatabaseModule,
        GraphQLApiModule,
        CatalogModule,
        StoriesModule,
        CurationsModule,
        LiveModule,
        SessionsModule,
        AccountsModule,
        CheckoutModule,
        DropsModule,
        HooksModule,
        IdentityModule,
        HealthModule,
      ],
      providers: [
        // Validates every `@Body({ schema })`, `@Query({ schema })` and `@Param({ schema })`.
        { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
        { provide: APP_FILTER, useClass: GatewayExceptionFilter },
        ShutdownLog,
      ],
    };
  }
}
