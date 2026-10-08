import type { CmsEventType } from '../webhooks/event';

/**
 * The address the admin opens to preview a draft in the store:
 *
 *   GET <STORE_PREVIEW_URL>?secret=<PREVIEW_SECRET>&type=<type>&slug=<slug>
 *
 * `type` is `story`, `curation` or `drop-page`, the same names the webhooks
 * use, and `slug` is the address the store renders: a story's artwork slug,
 * a curation's or a drop page's own slug. A document edited in Portuguese adds
 * `&locale=pt`, and the store opens its Portuguese edition. The store compares the secret in
 * constant time, turns on Next.js draft mode and redirects to the page, which
 * then reads drafts through the gateway, so the secret never stays in the
 * address bar.
 */
export interface PreviewTarget {
  readonly type: CmsEventType;
  readonly slug: string;
  /** The locale being edited; English, the default, needs no word. */
  readonly locale?: string;
}

export function previewUrl(storePreviewUrl: string, secret: string, target: PreviewTarget): string {
  const url = new URL(storePreviewUrl);
  url.searchParams.set('secret', secret);
  url.searchParams.set('type', target.type);
  url.searchParams.set('slug', target.slug);
  if (target.locale !== undefined && target.locale !== 'en') {
    url.searchParams.set('locale', target.locale);
  }
  return url.toString();
}

/**
 * Builds the preview address from a document being edited, which may not have
 * its slug yet; without one there is nothing to preview and the admin hides
 * the button.
 */
export function previewUrlFor(
  storePreviewUrl: string,
  secret: string,
  type: CmsEventType,
  slug: unknown,
  locale?: string,
): string | null {
  return typeof slug === 'string' && slug.length > 0
    ? previewUrl(storePreviewUrl, secret, {
        type,
        slug,
        ...(locale === undefined ? {} : { locale }),
      })
    : null;
}
