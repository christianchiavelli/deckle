import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

/**
 * The header the store's server sends, in preview, to read the CMS's newest
 * drafts. Caddy strips it from every request that comes from outside, and
 * without the secret it means nothing, so a browser only ever reads what is
 * published.
 */
export const PREVIEW_HEADER = 'deckle-preview';

/** Whether this request carries the preview secret, compared in constant time. */
export function readsDrafts(request: IncomingMessage, secret: string): boolean {
  const presented = request.headers[PREVIEW_HEADER];
  if (typeof presented !== 'string') {
    return false;
  }
  const given = Buffer.from(presented);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
