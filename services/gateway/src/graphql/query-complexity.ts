import type { ApolloServerPlugin, BaseContext, GraphQLRequestListener } from '@apollo/server';
import { type DocumentNode, GraphQLError, type GraphQLSchema } from 'graphql';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';

export const QUERY_TOO_COMPLEX = 'QUERY_TOO_COMPLEX';

/** A field's own estimate when it declares one (see complexity.ts), else 1. */
const estimators = [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })];

export function queryComplexity(
  schema: GraphQLSchema,
  document: DocumentNode,
  variables?: Record<string, unknown>,
  operationName?: string | null,
): number {
  return getComplexity({
    schema,
    query: document,
    estimators,
    ...(variables === undefined ? {} : { variables }),
    ...(operationName === undefined || operationName === null ? {} : { operationName }),
  });
}

export function tooComplexError(complexity: number, maximum: number): GraphQLError {
  return new GraphQLError(
    `This query would cost ${complexity}, above the limit of ${maximum}. Ask for fewer fields or smaller pages.`,
    {
      extensions: {
        code: QUERY_TOO_COMPLEX,
        complexity,
        maximumComplexity: maximum,
        http: { status: 400 },
      },
    },
  );
}

/**
 * Prices each operation once it is parsed and its variables are known (a page
 * size can come from a variable), and refuses it before any resolver runs.
 */
export function complexityPlugin(maximum: number): ApolloServerPlugin {
  const listener: GraphQLRequestListener<BaseContext> = {
    didResolveOperation({ schema, document, request, operationName }) {
      const complexity = queryComplexity(schema, document, request.variables, operationName);
      return complexity > maximum
        ? Promise.reject(tooComplexError(complexity, maximum))
        : Promise.resolve();
    },
  };
  return { requestDidStart: () => Promise.resolve(listener) };
}
