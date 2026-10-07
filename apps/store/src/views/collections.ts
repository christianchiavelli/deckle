import type { CurationsQuery } from '../gateway/generated';

export type Curation = CurationsQuery['curations'][number];

/**
 * The collections a visitor browses: the editor's curations with works in
 * them, leaving out the front page's own selection, which is not one.
 */
export function listedCurations(curations: readonly Curation[], frontPage: string): Curation[] {
  return curations.filter(
    (curation) => curation.slug !== frontPage && curation.artworks.length > 0,
  );
}

/** The pictures a collection shows, the first of them its cover. */
export function picturesOf(curation: Curation) {
  return curation.artworks.flatMap((work) => (work.image ? [work.image] : []));
}
