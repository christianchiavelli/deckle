/**
 * The cache tags the store marks its reads with, and the gateway drops when
 * commerce or the CMS reports a change. Both sides spell them through this
 * module, so a renamed tag fails to compile instead of leaving a page stale.
 */

/** Every page that lists works: a work's title, image or price can change any list. */
export const CATALOG = 'catalog';

/** A work as commerce sells it: its title, images and which sizes it offers. */
export const artworkTag = (slug: string) => `artwork:${slug}`;
export const priceTag = (slug: string) => `price:${slug}`;
export const stockTag = (slug: string) => `stock:${slug}`;
export const collectionTag = (slug: string) => `collection:${slug}`;
/** A work's story in the CMS, named by the work it tells about. */
export const storyTag = (artworkSlug: string) => `story:${artworkSlug}`;
export const curationTag = (slug: string) => `curation:${slug}`;
export const dropPageTag = (slug: string) => `drop-page:${slug}`;

/** Everything a work's own page shows: commerce's work, prices and stock, and its story. */
export const workTags = (slug: string): string[] => [
  artworkTag(slug),
  priceTag(slug),
  stockTag(slug),
  storyTag(slug),
];

/**
 * How a change reaches the cached pages. `expire` drops them at once, for
 * what must never be served stale, such as a price; `max` serves them stale
 * while the store rebuilds them, for editorial text.
 */
export type RevalidationProfile = 'expire' | 'max';

/** The longest tag Next.js accepts. */
export const MAX_TAG_LENGTH = 256;

/** A tag this vocabulary can spell: `catalog`, or a kind and a slug of lowercase words. */
export const TAG_PATTERN =
  /^(?:catalog|(?:artwork|price|stock|collection|story|curation|drop-page):[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function isCacheTag(value: string): boolean {
  return value.length <= MAX_TAG_LENGTH && TAG_PATTERN.test(value);
}
