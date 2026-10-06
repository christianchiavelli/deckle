import type { ArtworkChangeKind } from '../live/artwork-change.model.js';
import type { ArtworkChangeMessage } from '../live/artwork-events.js';
import type { HookEvent } from './hook-events.js';

/**
 * `expire` drops a tag's cached pages at once; `max` serves them stale while the
 * store rebuilds them in the background.
 */
export type RevalidationProfile = 'expire' | 'max';

export interface Revalidation {
  readonly tags: readonly string[];
  readonly profile: RevalidationProfile;
}

/**
 * The store's cache tags an event makes stale. Commerce data (what is for sale,
 * at what price) must never be served stale; editorial text can be, for a moment.
 * `catalog` is every page that lists works, which a product's title, image or
 * price can change. An asset event names no work, so it can only reach the lists.
 */
export function revalidationFor(event: HookEvent): Revalidation {
  switch (event.type) {
    case 'product':
      return expire(`artwork:${event.subject.slug}`, 'catalog');
    case 'variant':
      return expire(
        `artwork:${event.subject.slug}`,
        `price:${event.subject.slug}`,
        `stock:${event.subject.slug}`,
        'catalog',
      );
    case 'price':
      return expire(`price:${event.subject.slug}`, 'catalog');
    case 'stock':
      return expire(`stock:${event.subject.slug}`);
    case 'collection':
      return expire(`collection:${event.subject.slug}`, 'catalog');
    case 'asset':
      return expire('catalog');
    case 'story':
      return { tags: [`story:${event.subject.artworkSlug}`], profile: 'max' };
    case 'curation':
      return { tags: [`curation:${event.subject.slug}`], profile: 'max' };
    case 'drop-page':
      return { tags: [`drop-page:${event.subject.slug}`], profile: 'max' };
  }
}

const expire = (...tags: string[]): Revalidation => ({ tags, profile: 'expire' });

const CHANGE_KINDS = {
  product: 'PRODUCT',
  variant: 'VARIANT',
  price: 'PRICE',
  stock: 'STOCK',
} as const satisfies Record<string, ArtworkChangeKind>;

/** The `artworkChanged` event a commerce hook announces, or null when it is about no single work. */
export function artworkChangeFor(event: HookEvent): ArtworkChangeMessage | null {
  switch (event.type) {
    case 'product':
    case 'variant':
    case 'price':
    case 'stock':
      return {
        slug: event.subject.slug,
        kind: CHANGE_KINDS[event.type],
        action:
          event.action === 'created'
            ? 'CREATED'
            : event.action === 'updated'
              ? 'UPDATED'
              : 'DELETED',
        occurredAt: event.occurredAt,
      };
    case 'collection':
    case 'asset':
    case 'story':
    case 'curation':
    case 'drop-page':
      return null;
  }
}
