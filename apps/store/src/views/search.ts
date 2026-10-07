import { inOrder, type ListedWork } from './listing';

/** The longest search the page reads; anything past it is cut. */
export const MAX_QUERY = 100;

type Params = Readonly<Record<string, string | string[] | undefined>>;

/** What was searched for, from the address's `q`: trimmed, and cut to `MAX_QUERY`. */
export function queryFrom(params: Params): string {
  const value = params['q'];
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY) : '';
}

/** Accents and case set aside, so "durer" finds Dürer and "ETCHING" an etching. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The works whose title, maker, medium, technique or culture hold every word
 * searched for, oldest first. Nothing searched for finds nothing.
 */
export function searchWorks(
  works: readonly ListedWork[],
  query: string,
  locale: string,
): ListedWork[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const found = works.filter((work) => {
    const text = fold(
      [work.fullTitle, work.title, work.artist?.name, work.medium, work.technique, work.culture]
        .filter(Boolean)
        .join(' '),
    );
    return words.every((word) => text.includes(word));
  });
  return inOrder(found, locale);
}
