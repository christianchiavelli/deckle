interface Kin {
  readonly slug: string;
  readonly artist: { readonly name: string } | null;
  readonly department: string | null;
}

/**
 * The works shown under a work's own page: the same maker's first, then the
 * same department's, then the rest of the catalogue, each group in the
 * catalogue's own order. Never the work itself.
 */
export function morePrints<T extends Kin>(work: Kin, catalogue: readonly T[], count = 4): T[] {
  const rank = (entry: T) =>
    work.artist !== null && entry.artist?.name === work.artist.name
      ? 0
      : work.department !== null && entry.department === work.department
        ? 1
        : 2;
  // Sorting is stable, so each rank keeps the catalogue's order.
  return catalogue
    .filter((entry) => entry.slug !== work.slug)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, count);
}
