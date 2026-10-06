import { type ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { GqlContextType } from '@nestjs/graphql';

/**
 * Nest's default handler logs every error a resolver throws, a client's bad
 * input included, at error level. In GraphQL the error is handed back to Apollo
 * untouched instead: it becomes an `errors` entry, and the error logging plugin
 * logs only what a client could not have caused. HTTP routes keep Nest's handling.
 */
@Catch()
export class GatewayExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType<GqlContextType>() === 'graphql') return exception;
    super.catch(exception, host);
    return undefined;
  }
}
