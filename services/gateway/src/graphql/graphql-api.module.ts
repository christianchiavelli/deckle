import type { IncomingMessage } from 'node:http';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql';
import type { Env } from '../config/env.js';
import { Sessions } from '../sessions/sessions.service.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { armorProtection, MAX_TOKENS } from './armor.js';
import { MAX_QUERY_COMPLEXITY } from './complexity.js';
import { errorLoggingPlugin, formatGatewayError } from './errors.js';
import type { GatewayContext } from './gateway-context.js';
import { complexityPlugin } from './query-complexity.js';
import { RequestLoadersFactory, RequestLoadersModule } from './request-loaders.js';
import { GATEWAY_SCHEMA_OPTIONS } from './schema-options.js';
import { guardSubscriptions } from './subscription-guard.js';

export const GRAPHQL_PATH = '/graphql';

/** Apollo's Express integration passes `{ req, res }`; graphql-ws passes its own context. */
const isHttpOperation = (context: unknown): context is { req: IncomingMessage; res: unknown } =>
  typeof context === 'object' && context !== null && 'req' in context && 'res' in context;

/** The upgrade request behind a subscription, which graphql-ws keeps in `extra`. */
const upgradeRequestOf = (context: unknown): IncomingMessage | undefined => {
  if (typeof context !== 'object' || context === null || !('extra' in context)) return undefined;
  const { extra } = context;
  return typeof extra === 'object' && extra !== null && 'request' in extra
    ? (extra.request as IncomingMessage)
    : undefined;
};

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [RequestLoadersModule, SessionsModule],
      inject: [ConfigService, RequestLoadersFactory, GraphQLSchemaHost, Sessions],
      useFactory: (
        config: ConfigService<Env, true>,
        loaders: RequestLoadersFactory,
        schemaHost: GraphQLSchemaHost,
        sessions: Sessions,
      ): ApolloDriverConfig => {
        const production = config.get('NODE_ENV', { infer: true }) === 'production';
        const armor = armorProtection(production);
        return {
          path: GRAPHQL_PATH,
          autoSchemaFile: true,
          sortSchema: true,
          buildSchemaOptions: GATEWAY_SCHEMA_OPTIONS,
          // GraphiQL and introspection help while building the store; production needs neither.
          graphiql: !production,
          introspection: !production,
          includeStacktraceInErrorResponses: !production,
          allowBatchedHttpRequests: armor.allowBatchedHttpRequests,
          parseOptions: { maxTokens: MAX_TOKENS },
          // Each replica would keep its own registry of persisted queries; the store sends whole ones.
          persistedQueries: false,
          plugins: [complexityPlugin(MAX_QUERY_COMPLEXITY), errorLoggingPlugin(), ...armor.plugins],
          validationRules: armor.validationRules,
          formatError: formatGatewayError(production),
          context: (operation: unknown): GatewayContext =>
            isHttpOperation(operation)
              ? {
                  loaders: loaders.create({ cache: true }),
                  session: sessions.forHttp(operation.req, operation.res),
                }
              : {
                  loaders: loaders.create({ cache: false }),
                  session: sessions.forSubscription(upgradeRequestOf(operation)),
                },
          subscriptions: {
            'graphql-ws': {
              path: GRAPHQL_PATH,
              ...guardSubscriptions({
                schema: () => schemaHost.schema,
                validationRules: armor.validationRules,
                maxTokens: MAX_TOKENS,
                maxComplexity: MAX_QUERY_COMPLEXITY,
                publicOrigin: config.get('PUBLIC_ORIGIN', { infer: true }),
              }),
            },
          },
        };
      },
    }),
  ],
})
export class GraphQLApiModule {}
