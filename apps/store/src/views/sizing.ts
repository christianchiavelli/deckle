import { formatPpi } from '@deckle/ui/format';
import type { Copy } from '../copy';
import type { HomeQuery } from '../gateway/generated';
import { limitedAcross, smallestFirst } from './work';

type SizingWork = NonNullable<HomeQuery['sizing']>;

/**
 * The front page's band on how sizes are set, from one work's real scan: how
 * many pixels it has, the largest sheet they print, and what the next sheet
 * would need. Null when the work has no picture or prints at no size.
 */
export function sizingOf(work: SizingWork, copy: Copy): string | null {
  const sizes = smallestFirst(work.sizes);
  const largest = sizes.filter((size) => size.available).at(-1);
  if (!work.image || !largest) {
    return null;
  }
  const next = sizes.find(
    (size) => !size.available && size.unavailableReason === 'RESOLUTION_TOO_LOW',
  );
  const pixels = new Intl.NumberFormat(copy.locale);
  const required = next?.requiredPixels ?? null;
  // The side the next sheet runs short on, which is the number the text compares.
  const across = limitedAcross(next ?? largest);
  return copy.home.sizing({
    work: work.title,
    side: across ? 'across' : 'tall',
    scan: pixels.format(across ? work.image.scanWidth : work.image.scanHeight),
    largest: largest.size,
    ppi: formatPpi(largest.ppi, copy.locale),
    next: next?.size ?? null,
    required: required === null ? null : pixels.format(required),
  });
}
