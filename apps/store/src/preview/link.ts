import { copyOf, type Lang } from '../copy';

/**
 * The CMS's preview links (apps/cms/src/preview/preview-url.ts):
 *
 *   /api/preview?secret=<PREVIEW_SECRET>&type=<type>&slug=<slug>[&locale=pt]
 *
 * Each type is a document the store has a page for, and the slug is that
 * page's address: a story's work, a curation, a drop.
 */
const PAGES = {
  // A story is read on its work's page, below the print.
  story: (slug: string) => `/prints/${slug}#story`,
  curation: (slug: string) => `/collections/${slug}`,
  'drop-page': (slug: string) => `/drops/${slug}`,
} as const satisfies Record<string, (slug: string) => string>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The store's edition for the CMS's locale: Portuguese for `pt`, English for anything else. */
export function editionOf(locale: string | null): Lang {
  return locale === 'pt' ? 'pt-br' : 'en';
}

/**
 * The page a preview link opens, in the edition of the locale being edited,
 * or null when its type or slug names none.
 */
export function previewPage(
  type: string | null,
  slug: string | null,
  locale: string | null = null,
): string | null {
  if (type === null || slug === null || !Object.hasOwn(PAGES, type) || !SLUG.test(slug)) {
    return null;
  }
  return copyOf(editionOf(locale)).path(PAGES[type as keyof typeof PAGES](slug));
}

/** The way out of preview, back to `path` as published. */
export function leaveLink(path: string): string {
  return `/api/preview/exit?${new URLSearchParams({ path }).toString()}`;
}

const HERE = 'http://store.invalid';

/**
 * Where leaving preview returns to: the page it was left from, on the store's
 * own origin, or the front page. Anything that would leave the store, such as
 * `//elsewhere.example`, returns to the front page instead.
 */
export function returnPath(path: string | null): string {
  if (path === null) {
    return '/';
  }
  const url = new URL(path, HERE);
  return url.origin === HERE && path.startsWith('/')
    ? `${url.pathname}${url.search}${url.hash}`
    : '/';
}
