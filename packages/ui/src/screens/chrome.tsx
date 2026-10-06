import { tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Announcement } from '../sections/announcement.tsx';
import { SiteFooter } from '../sections/site-footer.tsx';
import { SiteHeader } from '../sections/site-header.tsx';

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

type Section = 'prints' | 'drops' | 'collections' | 'journal';

const nav: { key: Section; label: string; href: string }[] = [
  { key: 'prints', label: 'Prints', href: '/prints' },
  { key: 'drops', label: 'Drops', href: '/drops' },
  { key: 'collections', label: 'Collections', href: '/collections' },
  { key: 'journal', label: 'Journal', href: '/journal' },
];

export interface ChromeProps {
  current?: Section;
  /** The bar above the header, about the next drop. Not on the drop's own page. */
  announcement?: boolean;
  cartCount?: number;
  children: ReactNode;
}

/** What every page of the store shares: the skip link, the bars at the top, the footer. */
export function Chrome({ current, announcement = true, cartCount = 1, children }: ChromeProps) {
  return (
    <>
      <Skip href="#main">Skip to content</Skip>
      {announcement && (
        <Announcement href="/drops/melencolia-i" link="See the drop">
          A numbered edition of Melencolia I opens on Thursday at 18:00 UTC
        </Announcement>
      )}
      <SiteHeader
        home={{ href: '/', label: 'Deckle, home' }}
        nav={{
          label: 'Shop',
          items: nav.map((item) => ({ ...item, current: item.key === current })),
        }}
        search={{
          action: '/search',
          label: 'Search',
          placeholder: 'Search prints, artists and techniques',
          shortcut: '/',
        }}
        theme={{ label: 'Theme' }}
        account={{ label: 'Sign in with a passkey', href: '/sign-in' }}
        cart={{
          label: cartCount === 1 ? 'Cart, 1 print' : `Cart, ${cartCount} prints`,
          href: '/cart',
          count: cartCount,
        }}
        menu={{ open: 'Menu', close: 'Close the menu' }}
      />
      <main id="main">{children}</main>
      <SiteFooter
        home={{ href: '/', label: 'Deckle, home' }}
        label="Footer"
        about="Prints of public-domain works from The Met, in the sizes their scans can hold."
        columns={[
          {
            title: 'Shop',
            links: [
              { label: 'Prints', href: '/prints' },
              { label: 'Drops', href: '/drops' },
              { label: 'Collections', href: '/collections' },
            ],
          },
          {
            title: 'About',
            links: [
              { label: 'How we size prints', href: '/about/sizes' },
              { label: 'How drops work', href: '/about/drops' },
              { label: 'Journal', href: '/journal' },
            ],
          },
        ]}
        small="Images: The Metropolitan Museum of Art, Open Access (CC0). Deckle is a portfolio project: checkout is simulated and nothing ships."
      />
    </>
  );
}
