'use client';

import { SiteHeader, type SiteHeaderProps } from '@deckle/ui';
import { askTheStore } from './suggestions';
import { toggleTheme } from './theme';

export type StoreHeaderProps = Omit<SiteHeaderProps, 'theme'> & {
  themeLabel: string;
  /** Names the list the search suggests as one types. */
  suggestionsLabel: string;
};

/**
 * The design system's header, with what it needs from the browser: the theme
 * switch, and the store's suggestions for the search.
 */
export function StoreHeader({ themeLabel, suggestionsLabel, search, ...props }: StoreHeaderProps) {
  return (
    <SiteHeader
      {...props}
      search={{ ...search, suggest: { source: askTheStore, label: suggestionsLabel } }}
      theme={{ label: themeLabel, onToggle: toggleTheme }}
    />
  );
}
