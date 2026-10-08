import '@deckle/ui/global.css';
import './store.css';
import type { Metadata } from 'next';
import { StyleSheetManager, stylisPluginRSC } from 'styled-components';
import { DraftPreview } from '../../components/draft-preview';
import { StyledRegistry } from '../../components/styled-registry';
import { AddedProvider } from '../../live/added';
import { StoreApollo } from '../../live/apollo';
import { THEME_SCRIPT } from '../../components/theme';
import { copyOf, isLang, LANGS } from '../../copy';
import { EditionProvider } from '../../copy/client';
import { getCopy } from '../../copy/server';

/** Both editions are prerendered: English at the root, which the proxy rewrites to /en, and /pt-br. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { chrome } = await getCopy();
  return {
    title: { default: 'Deckle', template: '%s · Deckle' },
    description: chrome.about,
    icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang: segment } = await params;
  // The proxy sends no other edition here; anything else reads as English.
  const lang = isLang(segment) ? segment : 'en';
  return (
    // The theme script sets data-theme before React hydrates the root.
    <html lang={copyOf(lang).htmlLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {/* The Server Components' half of STYLIS_PLUGINS: the registry sets the same for the rest. */}
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          {/* The header and footer come from each section's layout, so the menu can mark it. */}
          <StyledRegistry>
            {/* The browser's islands read the page's edition from here. */}
            <EditionProvider lang={lang}>
              {/* Apollo for the cart, drops and account, and the cart's sheet. */}
              <StoreApollo>
                <AddedProvider>{children}</AddedProvider>
              </StoreApollo>
              <DraftPreview />
            </EditionProvider>
          </StyledRegistry>
        </StyleSheetManager>
      </body>
    </html>
  );
}
