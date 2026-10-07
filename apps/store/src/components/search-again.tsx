import { SearchField } from '@deckle/ui';
import { copy } from '../copy';

/** The search page's own field, holding what was searched for. */
export function SearchAgain({ query }: { query: string }) {
  return (
    <SearchField
      action="/search"
      label={copy.chrome.search}
      landmark={copy.search.again}
      placeholder={copy.chrome.searchPlaceholder}
      defaultValue={query}
    />
  );
}
