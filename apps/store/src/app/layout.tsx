import '@deckle/ui/global.css';
import './store.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StyleSheetManager, stylisPluginRSC } from 'styled-components';
import { Chrome } from '../components/chrome';
import { StyledRegistry } from '../components/styled-registry';
import { THEME_SCRIPT } from '../components/theme';
import { copy } from '../copy';

export const metadata: Metadata = {
  title: { default: 'Deckle', template: '%s · Deckle' },
  description: copy.chrome.about,
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets data-theme before React hydrates the root.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {/* The Server Components' half of STYLIS_PLUGINS: the registry sets the same for the rest. */}
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <StyledRegistry>
            <Chrome>{children}</Chrome>
          </StyledRegistry>
        </StyleSheetManager>
      </body>
    </html>
  );
}
