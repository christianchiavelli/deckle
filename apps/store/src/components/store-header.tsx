'use client';

import { SiteHeader, type SiteHeaderProps } from '@deckle/ui';
import { Suspense } from 'react';
import { useCopy } from '../copy/client';
import { AddedSheet, useHeaderState } from '../live/header';
import { askTheStore } from './suggestions';
import { toggleTheme } from './theme';

export type StoreHeaderProps = Omit<SiteHeaderProps, 'theme' | 'account' | 'cart' | 'notice'> & {
  themeLabel: string;
  /** Names the list the search suggests as one types. */
  suggestionsLabel: string;
};

/**
 * The design system's header, with what it needs from the browser: the theme
 * switch, the store's suggestions for the search, and this browser's own
 * account and cart, which no server render could know.
 */
export function StoreHeader({ themeLabel, suggestionsLabel, search, ...props }: StoreHeaderProps) {
  const copy = useCopy();
  const { cartCount, signedIn } = useHeaderState();
  return (
    <SiteHeader
      {...props}
      search={{ ...search, suggest: { source: askTheStore(copy.lang), label: suggestionsLabel } }}
      theme={{ label: themeLabel, onToggle: toggleTheme }}
      account={{
        label: signedIn ? copy.chrome.account : copy.chrome.signIn,
        href: copy.path('/account'),
      }}
      cart={{
        label: copy.chrome.cart(cartCount ?? 0),
        href: copy.path('/cart'),
        count: cartCount ?? 0,
      }}
      notice={
        // The sheet follows the page's path, which a shell built ahead of time cannot know.
        <Suspense fallback={null}>
          <AddedSheet />
        </Suspense>
      }
    />
  );
}
