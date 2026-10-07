'use client';

import { SearchField } from '@deckle/ui';
import { askTheStore } from './suggestions';

export interface SearchAgainProps {
  /** What was searched for, kept in the field. */
  query: string;
  label: string;
  landmark: string;
  placeholder: string;
  /** Names the list the field suggests as one types. */
  suggestions: string;
}

/** The search page's own field, holding what was searched for, and suggesting as the header's does. */
export function SearchAgain({
  query,
  label,
  landmark,
  placeholder,
  suggestions,
}: SearchAgainProps) {
  return (
    <SearchField
      action="/search"
      label={label}
      landmark={landmark}
      placeholder={placeholder}
      defaultValue={query}
      suggest={{ source: askTheStore, label: suggestions }}
    />
  );
}
