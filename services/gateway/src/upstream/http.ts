import { setTimeout as sleep } from 'node:timers/promises';
import { currentRequestId, REQUEST_ID_HEADER } from '../logging/request-context.js';
import { type UpstreamService, UpstreamUnavailableError } from './upstream-errors.js';

export interface UpstreamRequest {
  readonly service: UpstreamService;
  readonly url: string | URL;
  readonly method: 'GET' | 'POST';
  readonly headers?: Readonly<Record<string, string>>;
  /** Serialised as JSON. */
  readonly body?: unknown;
  readonly timeoutMs: number;
  /**
   * Retry once when the connection itself fails (refused, reset, DNS). Only for
   * requests that are safe to repeat: a timed-out request may still have run.
   */
  readonly retryOnNetworkError: boolean;
}

export interface UpstreamResponse {
  readonly status: number;
  /** The parsed body, or `undefined` when it was empty or not JSON. */
  readonly json: unknown;
  readonly headers: Headers;
}

const RETRY_DELAY_MS = { min: 50, spread: 100 };

/**
 * The gateway's only way out to another service: JSON in and out, a deadline on
 * every call, the request id passed along, and failures turned into typed errors.
 */
export async function sendUpstream(request: UpstreamRequest): Promise<UpstreamResponse> {
  const headers: Record<string, string> = { accept: 'application/json', ...request.headers };
  if (request.body !== undefined) headers['content-type'] = 'application/json';
  const requestId = currentRequestId();
  if (requestId !== undefined) headers[REQUEST_ID_HEADER] = requestId;

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers,
        body: request.body === undefined ? null : JSON.stringify(request.body),
        signal: AbortSignal.timeout(request.timeoutMs),
      });
      const text = await response.text();
      return { status: response.status, json: parseJson(text), headers: response.headers };
    } catch (error) {
      if (isTimeout(error)) {
        throw new UpstreamUnavailableError(
          request.service,
          `no answer within ${request.timeoutMs} ms`,
          { cause: error },
        );
      }
      if (attempt === 1 && request.retryOnNetworkError) {
        await sleep(RETRY_DELAY_MS.min + Math.random() * RETRY_DELAY_MS.spread);
        continue;
      }
      throw new UpstreamUnavailableError(request.service, 'unreachable', { cause: error });
    }
  }
}

function isTimeout(error: unknown) {
  return (
    error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

function parseJson(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
