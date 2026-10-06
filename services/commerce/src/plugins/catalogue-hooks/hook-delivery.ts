import { SIGNATURE_HEADER, signatureHeader, type CatalogueHookBody } from './hook-contract.js';

export type DeliveryOutcome =
  | { kind: 'delivered'; status: number }
  /** The gateway understood the request and refused it; sending the same bytes again cannot help. */
  | { kind: 'rejected'; status: number };

/** Thrown for anything worth another attempt; the job queue retries it with backoff. */
export class RetryableDeliveryError extends Error {
  override readonly name = 'RetryableDeliveryError';

  constructor(
    message: string,
    readonly status: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

const permanentStatuses = new Set([400, 410, 413, 422]);

export interface DeliveryRequest {
  readonly url: URL;
  readonly secret: string;
  readonly body: CatalogueHookBody;
  readonly timeoutMs: number;
  readonly now?: () => number;
  readonly fetch?: typeof fetch;
}

/**
 * POSTs one hook, signed for this attempt. The body is the same on every attempt,
 * and so is its `id`, which is what lets the gateway drop a duplicate.
 */
export async function deliverHook(request: DeliveryRequest): Promise<DeliveryOutcome> {
  const { url, secret, body, timeoutMs, now = Date.now, fetch: send = fetch } = request;
  const rawBody = JSON.stringify(body);
  const signature = signatureHeader(secret, rawBody, Math.floor(now() / 1000));

  let response: Response;
  try {
    response = await send(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'deckle-commerce',
        [SIGNATURE_HEADER]: signature,
      },
      body: rawBody,
      // A redirect would carry the signed body somewhere the secret was not meant for.
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new RetryableDeliveryError(`Could not reach ${url.origin}`, null, { cause: error });
  }
  // The body is not needed, but leaving it unread holds the connection open.
  await response.body?.cancel();

  if (response.status >= 200 && response.status < 300) {
    return { kind: 'delivered', status: response.status };
  }
  if (permanentStatuses.has(response.status)) {
    return { kind: 'rejected', status: response.status };
  }
  throw new RetryableDeliveryError(`The gateway answered ${response.status}`, response.status);
}

const baseDelayMs = 2_000;
const maxDelayMs = 5 * 60_000;

/**
 * Exponential backoff with jitter for the hook queue: about 2 s, 4 s, 8 s... up to
 * five minutes. Vendure's SQL queue asks for the delay on every poll, so the jitter
 * is derived from the job id rather than drawn at random: the same job always waits
 * the same time, and different jobs from one burst still spread out.
 */
export function hookBackoffMs(
  attemptsMade: number,
  jobId: string | number | null | undefined,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attemptsMade - 1));
  const seed = String(jobId ?? '');
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const jitter = (hash % 1000) / 1000;
  return Math.round(exponential * (0.75 + jitter * 0.5));
}
