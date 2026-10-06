import { formatMoney, MISSING } from '@deckle/ui/format';
import type { Copy } from '../copy';
import type { PrintTileFragment } from '../gateway/generated';
import { imageAt } from './images';

export interface Tile {
  readonly slug: string;
  readonly image: { readonly src: string; readonly width: number; readonly height: number };
  readonly title: string;
  readonly meta: string;
  readonly price: string;
  /** "A3 only", when a single size is for sale. */
  readonly only: string | null;
}

/** "Albrecht Dürer, 1514": the maker and the date, or whichever the record has. */
export function metaOf(work: Pick<PrintTileFragment, 'artist' | 'date'>): string {
  return [work.artist?.name, work.date].filter(Boolean).join(', ');
}

/** "From $55" over several sizes; "$90" and "A3 only" when one is sold; a dash when none is. */
export function priceOf(
  work: Pick<PrintTileFragment, 'priceFrom' | 'sizes'>,
  copy: Copy,
): { price: string; only: string | null } {
  const sold = work.sizes.filter((size) => size.available);
  const amount = formatMoney(
    work.priceFrom?.amount ?? null,
    work.priceFrom?.currencyCode ?? 'USD',
    copy.locale,
  );
  const [single] = sold;
  if (sold.length === 0 || amount === MISSING) {
    return { price: MISSING, only: null };
  }
  return sold.length === 1 && single
    ? { price: amount, only: copy.tile.only(single.size) }
    : { price: copy.tile.from(amount), only: null };
}

/** A work as a tile in a list, or null without a picture: a tile is its picture first. */
export function tileOf(work: PrintTileFragment, copy: Copy): Tile | null {
  if (!work.image) {
    return null;
  }
  return {
    slug: work.slug,
    image: {
      src: imageAt(work.image.url, 'card'),
      width: work.image.width,
      height: work.image.height,
    },
    title: work.title,
    meta: metaOf(work),
    ...priceOf(work, copy),
  };
}

/** The tiles of a list, leaving out any work without a picture. */
export function tilesOf(works: readonly PrintTileFragment[], copy: Copy): Tile[] {
  return works.flatMap((work) => {
    const tile = tileOf(work, copy);
    return tile ? [tile] : [];
  });
}
