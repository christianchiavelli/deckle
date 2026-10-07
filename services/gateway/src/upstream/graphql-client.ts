import { z } from 'zod';
import { sendUpstream } from './http.js';
import {
  UpstreamContractError,
  UpstreamGraphQLError,
  UpstreamHttpError,
  type UpstreamService,
  UpstreamUnavailableError,
} from './upstream-errors.js';

export interface GraphQLClientOptions {
  readonly service: UpstreamService;
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface GraphQLOperation<T> {
  readonly operationName: string;
  readonly document: string;
  readonly variables?: Readonly<Record<string, unknown>>;
  /** The shape of `data` the gateway relies on; anything else is a contract error. */
  readonly data: z.ZodType<T>;
}

const graphqlResponse = z.object({
  data: z.unknown().optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        extensions: z.object({ code: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

export interface GraphQLExchange {
  /** Headers for this call only, on top of the client's own. */
  readonly headers?: Readonly<Record<string, string>>;
  /** A read, safe to send again if the connection fails; a write never is. */
  readonly idempotent: boolean;
}

/** `data`, parsed, and the response's headers, for an upstream that answers in them too. */
export interface GraphQLAnswer<T> {
  readonly data: T;
  readonly headers: Headers;
}

/**
 * GraphQL over HTTP to one upstream. Responses are parsed, never trusted:
 * `data` goes through the operation's schema, and `errors` become typed errors.
 */
export class GraphQLClient {
  constructor(private readonly options: GraphQLClientOptions) {}

  /** A read: retried once if the connection fails, since running it twice is harmless. */
  async query<T>(operation: GraphQLOperation<T>): Promise<T> {
    return (await this.exchange(operation, { idempotent: true })).data;
  }

  /** A write: never retried, because a lost answer does not mean it did not run. */
  async mutate<T>(operation: GraphQLOperation<T>): Promise<T> {
    return (await this.exchange(operation, { idempotent: false })).data;
  }

  async exchange<T>(
    operation: GraphQLOperation<T>,
    { headers = {}, idempotent }: GraphQLExchange,
  ): Promise<GraphQLAnswer<T>> {
    const { service } = this.options;
    const response = await sendUpstream({
      service,
      url: this.options.url,
      method: 'POST',
      headers: { ...this.options.headers, ...headers },
      body: {
        operationName: operation.operationName,
        query: operation.document,
        variables: operation.variables ?? {},
      },
      timeoutMs: this.options.timeoutMs,
      retryOnNetworkError: idempotent,
    });

    if (response.status >= 500) {
      throw new UpstreamUnavailableError(service, `answered ${response.status}`);
    }

    // A GraphQL error is a 200 for some servers and a 400 for others (Vendure 3.8
    // among them). Either way the body says what went wrong, so it is read as
    // GraphQL errors rather than as a broken transport.
    const body = graphqlResponse.safeParse(response.json);
    const isGraphQLBody =
      body.success && (body.data.errors !== undefined || body.data.data !== undefined);
    if ((response.status !== 200 && response.status !== 400) || !isGraphQLBody) {
      throw new UpstreamHttpError(service, response.status, 'not a GraphQL response');
    }

    const { data, errors } = body.data;
    if (errors !== undefined && errors.length > 0) {
      throw new UpstreamGraphQLError(
        service,
        operation.operationName,
        errors.map((error) => ({ message: error.message, code: error.extensions?.code ?? null })),
      );
    }

    const parsed = operation.data.safeParse(data);
    if (!parsed.success) {
      throw new UpstreamContractError(service, operation.operationName, parsed.error);
    }
    return { data: parsed.data, headers: response.headers };
  }
}
