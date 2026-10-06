import type { ApolloServerPlugin } from '@apollo/server';
import { ApolloServerErrorCode, unwrapResolverError } from '@apollo/server/errors';
import { Logger } from '@nestjs/common';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { UpstreamError } from '../upstream/upstream-errors.js';

export const UPSTREAM_ERROR = 'UPSTREAM_ERROR';

/**
 * What a client is told about a failure. An upstream failure keeps its code and
 * the service's name, so the store can tell "commerce is down" from a bug; in
 * production, an unexpected error says nothing about the code that raised it.
 */
export function formatGatewayError(production: boolean) {
  return (formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError => {
    const original = unwrapResolverError(error);
    if (original instanceof UpstreamError) {
      return {
        message: `The ${original.service} service could not answer`,
        ...(formatted.locations === undefined ? {} : { locations: formatted.locations }),
        ...(formatted.path === undefined ? {} : { path: formatted.path }),
        extensions: { code: UPSTREAM_ERROR, service: original.service },
      };
    }
    if (
      production &&
      formatted.extensions?.['code'] === ApolloServerErrorCode.INTERNAL_SERVER_ERROR
    ) {
      return {
        message: 'Internal server error',
        ...(formatted.path === undefined ? {} : { path: formatted.path }),
        extensions: { code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR },
      };
    }
    return formatted;
  };
}

/** Logs the errors a client cannot fix, with the stack and the request id; client mistakes are not logged. */
export function errorLoggingPlugin(): ApolloServerPlugin {
  const logger = new Logger('GraphQL');
  return {
    requestDidStart: () =>
      Promise.resolve({
        didEncounterErrors({ errors, operationName }) {
          for (const error of errors) {
            const original = unwrapResolverError(error);
            if (original instanceof GraphQLError && original.extensions['code'] !== undefined)
              continue;
            logger.error(
              `${operationName ?? 'An operation'} failed at ${error.path?.join('.') ?? 'the root'}: ${error.message}`,
              original instanceof Error ? original.stack : undefined,
            );
          }
          return Promise.resolve();
        },
      }),
  };
}
