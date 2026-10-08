import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { isLang } from '../../../copy';
import { switchedPath } from '../../../views/editions';

/**
 * The language switch, followed before the page could tell it its address: a
 * work's page builds its shell before its slug is known. The browser names the
 * page it came from, and the store sends it to the same page in `?to=`.
 */
export function GET(request: Request): Response {
  const to = new URL(request.url).searchParams.get('to');
  // Behind Caddy, the host the browser asked for.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  // A path on the store's own origin, which switchedPath checks; typed routes cannot see that far.
  redirect(switchedPath(isLang(to) ? to : 'en', request.headers.get('referer'), host) as Route);
}
