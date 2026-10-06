import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { GraphQLClient, type GraphQLOperation } from '../upstream/graphql-client.js';

/** Vendure's default header for API keys (added in 3.6). Commerce lists `'api-key'` in `tokenMethod`. */
export const VENDURE_API_KEY_HEADER = 'vendure-api-key';

const ADMIN_API_TIMEOUT_MS = 10_000;

/**
 * The Admin API, as the gateway's own API key. Drops will reserve and release
 * stock through it; nothing in the public schema reaches it yet.
 */
@Injectable()
export class AdminApiClient {
  private readonly graphql: GraphQLClient;

  constructor(config: ConfigService<Env, true>) {
    this.graphql = new GraphQLClient({
      service: 'commerce',
      url: config.get('COMMERCE_ADMIN_API_URL', { infer: true }),
      headers: { [VENDURE_API_KEY_HEADER]: config.get('COMMERCE_API_KEY', { infer: true }) },
      timeoutMs: ADMIN_API_TIMEOUT_MS,
    });
  }

  query<T>(operation: GraphQLOperation<T>): Promise<T> {
    return this.graphql.query(operation);
  }

  mutate<T>(operation: GraphQLOperation<T>): Promise<T> {
    return this.graphql.mutate(operation);
  }
}
