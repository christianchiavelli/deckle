'use client';

import { SiteHeader, type SiteHeaderProps } from '@deckle/ui';
import { toggleTheme } from './theme';

export type StoreHeaderProps = Omit<SiteHeaderProps, 'theme'> & { themeLabel: string };

/** The design system's header, with the one thing it needs from the browser: the theme switch. */
export function StoreHeader({ themeLabel, ...props }: StoreHeaderProps) {
  return <SiteHeader {...props} theme={{ label: themeLabel, onToggle: toggleTheme }} />;
}
