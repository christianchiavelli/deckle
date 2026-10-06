import type { IncomingMessage } from 'node:http';
import type { GraphQLWsSubscriptionsConfig } from '@nestjs/graphql';
import {
  type DocumentNode,
  GraphQLError,
  type GraphQLSchema,
  parse,
  specifiedRules,
  validate,
  type ValidationRule,
} from 'graphql';
import { queryComplexity, tooComplexError } from './query-complexity.js';

interface SubscriptionLimits {
  /** The schema being served; read late, since it is built after the options. */
  readonly schema: () => GraphQLSchema;
  readonly validationRules: readonly ValidationRule[];
  readonly maxTokens: number;
  readonly maxComplexity: number;
  readonly publicOrigin: string;
}

const isUpgradeRequest = (extra: unknown): extra is { request: IncomingMessage } =>
  typeof extra === 'object' && extra !== null && 'request' in extra;

/**
 * graphql-ws executes subscriptions itself, past Apollo's plugins and
 * validation rules, so the limits HTTP operations get are applied here too.
 * WebSocket upgrades also bypass Nest's CSRF check, so a browser connecting
 * from another site is turned away by its Origin.
 */
export function guardSubscriptions(
  limits: SubscriptionLimits,
): Pick<GraphQLWsSubscriptionsConfig, 'onConnect' | 'onSubscribe'> {
  return {
    onConnect(context) {
      if (!isUpgradeRequest(context.extra)) return false;
      const origin = context.extra.request.headers.origin;
      return origin === undefined || origin === limits.publicOrigin;
    },
    onSubscribe(_context, _id, payload) {
      let document: DocumentNode;
      try {
        document = parse(payload.query, { maxTokens: limits.maxTokens });
      } catch (error) {
        return [
          error instanceof GraphQLError ? error : new GraphQLError('The operation does not parse'),
        ];
      }
      const schema = limits.schema();
      const errors = validate(schema, document, [...specifiedRules, ...limits.validationRules]);
      if (errors.length > 0) return errors;

      const complexity = queryComplexity(
        schema,
        document,
        payload.variables ?? undefined,
        payload.operationName,
      );
      if (complexity > limits.maxComplexity)
        return [tooComplexError(complexity, limits.maxComplexity)];
      // Nothing returned: graphql-ws goes on to parse, validate and run the operation as usual.
      return undefined;
    },
  };
}
