import type {
  SearchSuggestions,
  SuggestionSource,
} from '../components/search-field/search-field.tsx';
import { allWorks, imageOf, LOCALE, metaOf, tally, techniqueOf } from './fixtures.ts';

/**
 * The suggestions a search field shows as one types, drawn from the data set
 * the way the store serves them: the makers and techniques whose names, then
 * the prints whose records, hold a word starting with each word typed. The
 * store adds typo tolerance (ADR 0044); a prototype needs only the look.
 */

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const wordsOf = (value: string) =>
  fold(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const holds = (text: string, typed: readonly string[]) => {
  const words = wordsOf(text);
  return typed.every((start) => words.some((word) => word.startsWith(start)));
};

const prints = (count: number) => (count === 1 ? '1 print' : `${String(count)} prints`);
const slugOf = (value: string) => fold(value).replace(/[^a-z0-9]+/g, '-');
const and = new Intl.ListFormat(LOCALE, { type: 'conjunction' });

export function suggestionsFor(query: string): SearchSuggestions {
  const typed = wordsOf(query);
  const works = allWorks.filter((entry) =>
    holds(
      [entry.title, entry.artist.name, techniqueOf(entry), entry.medium, entry.culture].join(' '),
      typed,
    ),
  );
  const makers = tally(allWorks.map((entry) => entry.artist.name))
    .filter(({ value }) => holds(value, typed))
    .slice(0, 3);
  const techniques = tally(allWorks.map(techniqueOf))
    .filter(({ value }) => holds(value, typed))
    .slice(0, 2);
  const shown = works.slice(0, 5);

  const groups = [
    {
      label: 'Artists',
      suggestions: makers.map(({ value, count }) => ({
        href: `/search?q=${encodeURIComponent(value)}`,
        label: value,
        count: prints(count),
      })),
    },
    {
      label: 'Techniques',
      suggestions: techniques.map(({ value, count }) => ({
        href: `/prints?technique=${slugOf(value)}`,
        label: value,
        count: prints(count),
      })),
    },
    {
      label: 'Prints',
      suggestions: shown.map((entry) => ({
        href: `/prints/${entry.slug}`,
        label: entry.shortTitle,
        detail: metaOf(entry),
        image: imageOf(entry),
      })),
    },
  ].filter((group) => group.suggestions.length > 0);

  return {
    groups,
    all:
      works.length > 0
        ? {
            href: `/search?q=${encodeURIComponent(query)}`,
            label:
              works.length === 1
                ? `1 print for “${query}”`
                : `All ${prints(works.length)} for “${query}”`,
          }
        : null,
    none: `No prints, artists or techniques match “${query}”`,
    status:
      groups.length > 0
        ? and.format([
            ...(makers.length > 0
              ? [makers.length === 1 ? '1 artist' : `${String(makers.length)} artists`]
              : []),
            ...(techniques.length > 0
              ? [
                  techniques.length === 1
                    ? '1 technique'
                    : `${String(techniques.length)} techniques`,
                ]
              : []),
            ...(shown.length > 0 ? [prints(shown.length)] : []),
          ])
        : `No match for “${query}”`,
  };
}

/** The data set as a source, answering at once. */
export const suggestFromDataSet: SuggestionSource = (query) =>
  Promise.resolve(suggestionsFor(query));
