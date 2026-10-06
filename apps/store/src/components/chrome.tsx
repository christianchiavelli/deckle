import { SiteFooter } from '@deckle/ui';
import { tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { copy } from '../copy';
import { StoreHeader } from './store-header';

const Skip = styled.a`
  position: absolute;
  inset-inline-start: ${t.space.gapMd};
  inset-block-start: -10rem;
  z-index: 20;
  padding: ${t.space.gapSm} ${t.space.gapMd};
  border-radius: ${t.radius.control};
  background: ${t.action.primary};
  color: ${t.text.onAction};

  &:focus {
    inset-block-start: ${t.space.gapMd};
  }
`;

const { chrome } = copy;

/**
 * What every page shares: the skip link, the header, the footer. Drops and the
 * cart are not open yet, so there is no announcement bar and the cart is empty.
 */
export function Chrome({ children }: { children: ReactNode }) {
  return (
    <>
      <Skip href="#main">{chrome.skip}</Skip>
      <StoreHeader
        home={{ href: '/', label: chrome.home }}
        nav={{
          label: chrome.nav,
          items: [
            { label: chrome.prints, href: '/prints' },
            { label: chrome.drops, href: '/drops' },
            { label: chrome.collections, href: '/collections' },
            { label: chrome.journal, href: '/journal' },
          ],
        }}
        search={{
          action: '/search',
          label: chrome.search,
          placeholder: chrome.searchPlaceholder,
          shortcut: '/',
        }}
        themeLabel={chrome.theme}
        account={{ label: chrome.account, href: '/sign-in' }}
        cart={{ label: chrome.cart(0), href: '/cart', count: 0 }}
        menu={{ open: chrome.menuOpen, close: chrome.menuClose }}
      />
      <main id="main">{children}</main>
      <SiteFooter
        home={{ href: '/', label: chrome.home }}
        label={chrome.footer}
        about={chrome.about}
        columns={[
          {
            title: chrome.shop,
            links: [
              { label: chrome.prints, href: '/prints' },
              { label: chrome.drops, href: '/drops' },
              { label: chrome.collections, href: '/collections' },
            ],
          },
          {
            title: chrome.aboutColumn,
            links: [
              { label: chrome.howWeSize, href: '/about/sizes' },
              { label: chrome.howDropsWork, href: '/about/drops' },
              { label: chrome.journal, href: '/journal' },
            ],
          },
        ]}
        small={chrome.small}
      />
    </>
  );
}
