import type { SearchSuggestions } from '@deckle/ui';
import type { Copy } from '../copy';
import { imageAt } from './images';
import { hrefOf, NO_CHOICE } from './listing';
import type { Suggestions } from './search';
import { metaOf } from './tiles';

/**
 * The suggestions as the search field lists them: the makers, each leading to
 * a search for their name; the techniques, to the prints page with that
 * filter on; the works, to their pages, each with a thumbnail; and the search
 * page for everything. Words come from the copy, so the browser gets them
 * written out and formats nothing.
 */
export function suggestionListOf(
  suggestions: Suggestions,
  query: string,
  copy: Copy,
): SearchSuggestions {
  const text = copy.search.suggest;
  const groups = [
    {
      label: text.artists,
      suggestions: suggestions.artists.map(({ name, count }) => ({
        href: `/search?q=${encodeURIComponent(name)}`,
        label: name,
        count: copy.search.count(count),
      })),
    },
    {
      label: text.techniques,
      suggestions: suggestions.techniques.map(({ name, count }) => ({
        href: hrefOf({ ...NO_CHOICE, technique: name }),
        label: name,
        count: copy.search.count(count),
      })),
    },
    {
      label: text.prints,
      suggestions: suggestions.works.map((work) => ({
        href: `/prints/${work.slug}`,
        label: work.title,
        detail: metaOf(work),
        ...(work.image && {
          image: {
            src: imageAt(work.image.url, 'thumb'),
            width: work.image.width,
            height: work.image.height,
          },
        }),
      })),
    },
  ].filter((group) => group.suggestions.length > 0);

  return {
    groups,
    all:
      suggestions.total > 0
        ? {
            href: `/search?q=${encodeURIComponent(query)}`,
            label: text.all(suggestions.total, query),
          }
        : null,
    none: text.none(query),
    status:
      groups.length > 0
        ? text.status(
            suggestions.artists.length,
            suggestions.techniques.length,
            suggestions.works.length,
          )
        : text.none(query),
  };
}
