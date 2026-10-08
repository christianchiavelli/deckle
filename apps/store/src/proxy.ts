import { type NextRequest, NextResponse } from 'next/server';

const PORTUGUESE = '/pt-br';

/**
 * The origin the reader asked: behind Caddy, the store's own address is
 * Docker's, and Caddy passes on the host the browser named.
 */
function originOf(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const scheme = request.headers.get('x-forwarded-proto') ?? 'http';
  return host === null ? request.nextUrl.origin : `${scheme}://${host}`;
}

/** The page's path in English, the edition at the root: `/pt-br/prints` is `/prints`. */
function englishPathOf(pathname: string): string {
  return pathname === PORTUGUESE ? '/' : pathname.slice(PORTUGUESE.length);
}

/**
 * Every page lives under app/[lang]. English is the root of the address, so
 * an English page is rewritten to its /en route, and an /en address redirects
 * to the one readers share; Portuguese is under /pt-br as it stands. Each
 * answer names the page in both editions, for search engines.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const shared = request.nextUrl.clone();
    shared.pathname = pathname.slice('/en'.length) || '/';
    return NextResponse.redirect(shared, 308);
  }
  const portuguese = pathname === PORTUGUESE || pathname.startsWith(`${PORTUGUESE}/`);
  const english = portuguese ? englishPathOf(pathname) : pathname;
  const response = portuguese
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(`/en${english === '/' ? '' : english}${search}`, request.url));
  const inPortuguese = english === '/' ? PORTUGUESE : `${PORTUGUESE}${english}`;
  const origin = originOf(request);
  response.headers.set(
    'Link',
    [
      `<${origin}${english}>; rel="alternate"; hreflang="en"`,
      `<${origin}${inPortuguese}>; rel="alternate"; hreflang="pt-BR"`,
      `<${origin}${english}>; rel="alternate"; hreflang="x-default"`,
    ].join(', '),
  );
  return response;
}

export const config = {
  // Pages only: not the store's API, Next's own files or the favicon.
  matcher: ['/((?!api/|_next/|favicon\\.svg).*)'],
};
