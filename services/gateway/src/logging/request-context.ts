import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Logger } from '@nestjs/common';

interface RequestContext {
  readonly requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();
const requestIds = new WeakMap<IncomingMessage, string>();
const accessLog = new Logger('Http');

export const REQUEST_ID_HEADER = 'x-request-id';

/** An id from the proxy is kept when it is a plain token; anything else is replaced, never echoed. */
const ACCEPTED_REQUEST_ID = /^[\w.:-]{8,128}$/;

/** The id of the request being served, for log lines and the calls made on its behalf. */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Runs `work` as part of a request, so what it logs carries that request's id. */
export function withRequestId<T>(requestId: string, work: () => T): T {
  return storage.run({ requestId }, work);
}

/**
 * Gives every request an id, returns it in `x-request-id`, logs the request when
 * it ends, and keeps the id in async context so a line logged deep in a resolver
 * still says which request it belongs to. Registered before any other middleware.
 */
export function requestContext(
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incoming === 'string' && ACCEPTED_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  requestIds.set(request, requestId);
  response.setHeader(REQUEST_ID_HEADER, requestId);

  // Read now: a router mounted on a path (Apollo's, at /graphql) rewrites `request.url`.
  const path = request.url?.split('?')[0] ?? '/';
  const startedAt = performance.now();
  response.once('finish', () => {
    const entry = {
      method: request.method,
      path,
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    };
    // The container health check polls every few seconds; it would drown the log.
    if (path === '/health') {
      accessLog.verbose('request', entry);
    } else {
      accessLog.log('request', entry);
    }
  });

  withRequestId(requestId, next);
}

/**
 * The body parser calls the next middleware from a stream callback, outside the
 * async context the request started in. Registered right after it, this puts
 * the request's context back for everything that follows.
 */
export function resumeRequestContext(
  request: IncomingMessage,
  _response: ServerResponse,
  next: () => void,
) {
  const requestId = requestIds.get(request);
  if (requestId === undefined) {
    next();
  } else {
    withRequestId(requestId, next);
  }
}
