import type { LanguageOption } from '@deckle/ui';
import { copyOf, type Lang, LANGS } from '../copy';
import { returnPath } from '../preview/link';

/** An edition's prefix at the start of a path, a whole segment of it. */
const PREFIX = new RegExp(`^/(?:${LANGS.join('|')})(?=[/?]|$)`);

/**
 * The page a path names, query and all, in no edition: `/pt-br/prints` is
 * `/prints`, and so is `/en/prints`, the route the proxy rewrites an English
 * address to.
 */
export function pageOf(pathname: string): string {
  const page = pathname.replace(PREFIX, '');
  return page.startsWith('/') ? page : `/${page}`;
}

/** The switch between the editions, each leading where `hrefOf` says, the reader's marked. */
function editionsWith(current: Lang, hrefOf: (lang: Lang) => string): LanguageOption[] {
  return LANGS.map((lang) => {
    const copy = copyOf(lang);
    return {
      name: copy.edition.name,
      short: copy.edition.short,
      lang: copy.htmlLang,
      href: hrefOf(lang),
      current: lang === current,
    };
  });
}

/** The switch between the editions: `page` in each of them. */
export function editionsOf(page: string, current: Lang): LanguageOption[] {
  return editionsWith(current, (lang) => copyOf(lang).path(page));
}

/**
 * The switch before the page knows its own address: each link asks the store,
 * which finds the page in the address the browser says it came from.
 */
export function editionsFromHere(current: Lang): LanguageOption[] {
  return editionsWith(
    current,
    (lang) => `/api/edition?${new URLSearchParams({ to: lang }).toString()}`,
  );
}

/**
 * Where `/api/edition` sends the reader: the page named by `referer`, query
 * kept, in the edition `to`, when that page is on the store's own `host`. Any
 * other leads to the edition's front page.
 */
export function switchedPath(to: Lang, referer: string | null, host: string | null): string {
  const front = copyOf(to).path('/');
  if (referer === null || host === null || !URL.canParse(referer)) {
    return front;
  }
  const from = new URL(referer);
  return from.host === host
    ? returnPath(copyOf(to).path(pageOf(`${from.pathname}${from.search}`)))
    : front;
}

/** The edition a link's `hreflang` names, `pt-BR` for `pt-br`, if the store has it. */
export function editionNamed(htmlLang: string): Lang | undefined {
  return LANGS.find((lang) => copyOf(lang).htmlLang === htmlLang);
}
