import { z } from 'zod';
import type { TypedDocumentString } from './generated';

/**
 * One request to the gateway's GraphQL endpoint. The envelope is checked here;
 * the shape of `data` is the gateway's to keep: it executes every operation
 * against the committed schema these types are generated from, so data that
 * reaches the store has the fields and the nulls the types say.
 */

const envelope = z.object({
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        extensions: z.object({ code: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

/** The gateway gave no data: it was down, refused the operation, or every field failed. */
export class GatewayError extends Error {
  override readonly name = 'GatewayError';

  constructor(
    message: string,
    /** The `extensions.code` of each error the gateway listed, e.g. `UPSTREAM_ERROR`. */
    readonly codes: readonly string[] = [],
  ) {
    super(message);
  }
}

export interface GatewayAnswer<TResult> {
  readonly data: TResult;
  /**
   * False when some fields failed and came back null with an error beside
   * them, as when the CMS is down and a work's story cannot be read. The rest
   * is still worth showing, but not worth keeping for long.
   */
  readonly complete: boolean;
}

export async function requestGateway<TResult, TVariables>(
  url: string,
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
  send: typeof fetch = fetch,
): Promise<GatewayAnswer<TResult>> {
  let response: Response;
  try {
    response = await send(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/graphql-response+json, application/json',
      },
      body: JSON.stringify({ query: document.toString(), variables }),
    });
  } catch (cause) {
    throw new GatewayError(`The gateway did not answer: ${String(cause)}`);
  }

  const parsed = envelope.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) {
    throw new GatewayError(`The gateway answered ${String(response.status)}, but not in GraphQL`);
  }
  const { data, errors = [] } = parsed.data;
  const codes = errors.map((error) => error.extensions?.code ?? 'UNKNOWN');
  if (data === undefined || data === null) {
    const reason = errors.map((error) => error.message).join('; ') || 'no data';
    throw new GatewayError(`The gateway answered ${String(response.status)} with ${reason}`, codes);
  }
  return { data: data as TResult, complete: errors.length === 0 };
}
