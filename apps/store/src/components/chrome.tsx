import { SiteFooter } from '@deckle/ui';
import { tokens as t } from '@deckle/tokens';
import { type ReactNode, Suspense } from 'react';
import styled from 'styled-components';
import { copy } from '../copy';
import { AnnouncementSpace, DropAnnouncement } from './drop-announcement';
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

/** The parts of the shop the menu names. */
export type Section = 'prints' | 'drops' | 'collections' | 'journal';

const sections = [
  { key: 'prints', label: chrome.prints, href: '/prints' },
  { key: 'drops', label: chrome.drops, href: '/drops' },
  { key: 'collections', label: chrome.collections, href: '/collections' },
  { key: 'journal', label: chrome.journal, href: '/journal' },
] as const satisfies readonly { key: Section; label: string; href: string }[];

export interface ChromeProps {
  /** The section the page is in, marked in the menu; none for the front page or a search. */
  current?: Section;
  /** The bar above the header about the drop worth knowing today. Not on a drop's own page. */
  announcement?: boolean;
  children: ReactNode;
}

/**
 * What every page shares: the skip link, the line about the next drop, the
 * header, the footer. Each section's layout names itself, so the menu is marked
 * in the static shell, before a work's slug is known. The drop's line depends
 * on the hour and on its copies, so it arrives on request into a space kept
 * for it.
 */
export function Chrome({ current, announcement = true, children }: ChromeProps) {
  return (
    <>
      <Skip href="#main">{chrome.skip}</Skip>
      {announcement && (
        <Suspense fallback={<AnnouncementSpace />}>
          <DropAnnouncement />
        </Suspense>
      )}
      <StoreHeader
        home={{ href: '/', label: chrome.home }}
        nav={{
          label: chrome.nav,
          items: sections.map(({ key, label, href }) => ({
            label,
            href,
            current: key === current,
          })),
        }}
        search={{
          action: '/search',
          label: chrome.search,
          placeholder: chrome.searchPlaceholder,
          shortcut: '/',
        }}
        themeLabel={chrome.theme}
        suggestionsLabel={copy.search.suggest.label}
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
