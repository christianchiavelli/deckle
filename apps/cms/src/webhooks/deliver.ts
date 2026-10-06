import type { CmsEvent } from './event';
import { signatureHeader, signBody } from './signature';

export interface DeliveryTarget {
  readonly url: string;
  readonly secret: string;
}

export interface DeliveryOptions {
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

export class DeliveryError extends Error {
  override readonly name = 'DeliveryError';

  constructor(
    readonly eventId: string,
    readonly status: number | null,
    options?: ErrorOptions,
  ) {
    super(
      status === null
        ? `The gateway could not be reached for event ${eventId}`
        : `The gateway answered ${status} to event ${eventId}`,
      options,
    );
  }
}

/**
 * Sends one event and resolves once the gateway has taken it. The signature is
 * made at send time, so a retry an hour later still falls inside the
 * receiver's five-minute tolerance while the event keeps its first `id`.
 */
export async function deliverEvent(
  event: CmsEvent,
  target: DeliveryTarget,
  { fetch: send = fetch, now = () => new Date(), timeoutMs = 10_000 }: DeliveryOptions = {},
): Promise<{ status: number }> {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(now().getTime() / 1000);

  let response: Response;
  try {
    response = await send(target.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [signatureHeader]: signBody(target.secret, body, timestamp),
      },
      body,
      // A signed event goes to the configured URL or nowhere.
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new DeliveryError(event.id, null, { cause: error });
  }

  // Nothing in the answer is needed; draining it frees the connection.
  await response.body?.cancel();
  if (!response.ok) {
    throw new DeliveryError(event.id, response.status);
  }
  return { status: response.status };
}
