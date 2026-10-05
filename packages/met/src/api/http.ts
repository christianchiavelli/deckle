import { delay } from './delay.js';
import { MetBlockedError, MetHttpError, MetRequestError } from './errors.js';
import type { Gate } from './gate.js';

export interface HttpOptions {
  readonly fetch: typeof fetch;
  readonly userAgent: string;
  /** Paces every attempt, retries included: each one costs The Met a request. */
  readonly gate: Gate;
  /** For one attempt, body included, so a stalled download is cut off as well. */
  readonly timeoutMs: number;
  /** Tries after the first. */
  readonly retries: number;
  readonly backoff: Backoff;
  /** The wait after the CDN blocks the address, which it lifts within a minute. */
  readonly blockedWaitMs: number;
  /** A value in [0, 1); `Math.random` outside tests. */
  readonly random: () => number;
}

export interface Backoff {
  readonly baseMs: number;
  readonly maxMs: number;
}

export interface GetOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

/**
 * The wait before retry number `attempt` (0 for the first retry): "full jitter",
 * a random point below an exponential ceiling, so clients that failed together
 * do not come back together.
 */
export function backoffDelay(attempt: number, { baseMs, maxMs }: Backoff, random: () => number) {
  return Math.floor(random() * Math.min(maxMs, baseMs * 2 ** attempt));
}

/** `Retry-After` in milliseconds, from either of its forms, or null when absent or unreadable. */
export function parseRetryAfter(value: string | null, now: number): number | null {
  if (value === null || value.trim() === '') return null;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

/** The CDN's block page: a 403 in HTML, where the API itself only ever answers JSON. */
export function isCdnBlock(response: Response) {
  return response.status === 403 && !(response.headers.get('content-type') ?? '').includes('json');
}

const isTransientStatus = (status: number) => status === 429 || status >= 500;

/** Network failures surface from `fetch` as a TypeError, timeouts as a TimeoutError. */
const isTransientError = (error: unknown) =>
  error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError');

type Outcome<T> = { done: true; value: T } | { done: false; failure: unknown };

export interface Http {
  /**
   * GETs `url` and hands the response to `read`, retrying what is worth
   * retrying: network failures, timeouts, 429, 5xx and the CDN's block page.
   * `read` runs inside the attempt, so a body cut off halfway is retried too.
   * Any other status reaches `read` as it came.
   */
  get<T>(url: string, read: (response: Response) => Promise<T>, options?: GetOptions): Promise<T>;
}

export function createHttp(options: HttpOptions): Http {
  const { gate, retries, backoff, random } = options;

  return {
    async get<T>(
      url: string,
      read: (response: Response) => Promise<T>,
      { headers = {}, timeoutMs = options.timeoutMs }: GetOptions = {},
    ): Promise<T> {
      let lastFailure: unknown = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await delay(waitBefore(attempt - 1, lastFailure));

        const outcome = await gate.run(async (): Promise<Outcome<T>> => {
          try {
            const response = await options.fetch(url, {
              headers: { 'user-agent': options.userAgent, ...headers },
              signal: AbortSignal.timeout(timeoutMs),
            });
            if (isCdnBlock(response) || isTransientStatus(response.status)) {
              await response.body?.cancel();
              return { done: false, failure: response };
            }
            return { done: true, value: await read(response) };
          } catch (error) {
            if (isTransientError(error)) return { done: false, failure: error };
            throw error;
          }
        });

        if (outcome.done) return outcome.value;
        lastFailure = outcome.failure;
      }

      if (lastFailure instanceof Response) {
        if (isCdnBlock(lastFailure)) throw new MetBlockedError(url);
        throw new MetHttpError(
          url,
          lastFailure.status,
          lastFailure.statusText || 'no reason given',
        );
      }
      throw new MetRequestError(url, retries + 1, { cause: lastFailure });
    },
  };

  function waitBefore(retry: number, failure: unknown) {
    const jittered = backoffDelay(retry, backoff, random);
    if (!(failure instanceof Response)) return jittered;
    if (isCdnBlock(failure)) return options.blockedWaitMs + jittered;
    // A Retry-After is The Met saying when to come back: it wins over our own
    // guess, though never by more than the longest wait we would choose.
    const asked = parseRetryAfter(failure.headers.get('retry-after'), Date.now());
    return asked === null ? jittered : Math.min(asked, backoff.maxMs);
  }
}
