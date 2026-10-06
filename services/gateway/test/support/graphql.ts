import request from 'supertest';
import type { TestApp } from './test-app.js';

export interface GraphQLErrorEntry {
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface GraphQLResponse<TData> {
  readonly status: number;
  readonly data: TData | null | undefined;
  readonly errors: readonly GraphQLErrorEntry[] | undefined;
  readonly headers: Readonly<Record<string, string>>;
}

/** A GraphQL POST through supertest, as the store's server would send it. */
export async function graphql<TData = Record<string, unknown>>(
  target: TestApp,
  query: string,
  variables?: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<GraphQLResponse<TData>> {
  const response = await request(target.app.getHttpServer())
    .post('/graphql')
    .set(headers)
    .send({ query, ...(variables === undefined ? {} : { variables }) });
  const body: { data?: TData | null; errors?: GraphQLErrorEntry[] } = response.body;
  return {
    status: response.status,
    data: body.data,
    errors: body.errors,
    headers: response.headers,
  };
}

/** The `extensions.code` of each error, the part of an error a client branches on. */
export const errorCodes = (response: GraphQLResponse<unknown>) =>
  (response.errors ?? []).map((error) => error.extensions?.['code']);
