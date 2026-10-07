'use client';

import { SearchField } from '@deckle/ui';
import { copy } from '../copy';

/** The search page's own field, holding what was searched for. A client component: it needs `useId`. */
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
