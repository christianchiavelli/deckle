import { media, tokens as t } from '@deckle/tokens';
import { type MouseEventHandler, type ReactNode, useId } from 'react';
import styled from 'styled-components';
import { Icon } from '../components/icon/icon.tsx';
import { IconButton, IconLink } from '../components/icon-button/icon-button.tsx';
import { Logo } from '../components/logo/logo.tsx';
import { SearchField, type SearchFieldProps } from '../components/search-field/search-field.tsx';
import { VisuallyHidden } from '../components/visually-hidden/visually-hidden.tsx';
import { typeRole } from '../theme/type.ts';
import { inline } from './band.tsx';

const Bar = styled.header`
  ${inline}
  position: sticky;
  inset-block-start: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: ${t.space.gapXs};
  min-block-size: 4rem;
  border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
  background: ${t.surface.page};

  @media ${media.md} {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    gap: ${t.space.gap2xl};
    min-block-size: 4.5rem;
  }
`;

/** Shown on a phone only, or from a laptop up only. */
const Narrow = styled.div`
  display: contents;

  @media ${media.md} {
    display: none;
  }
`;

const Wide = styled.div`
  display: none;

  @media ${media.md} {
    display: contents;
  }
`;

const Tools = styled.div`
  display: flex;
  align-items: center;
  gap: ${t.space.gap2xs};
  margin-inline-start: auto;
`;

const Nav = styled.nav`
  ul {
    display: flex;
    gap: ${t.space.gapLg};
  }

  a {
    position: relative;
    display: block;
    padding-block: ${t.space.gapXs};
    color: ${t.text.secondary};
    font-size: 0.9375rem;
    font-weight: 500;
    text-decoration: none;
  }

  a:hover,
  a[aria-current='page'] {
    color: ${t.text.primary};
  }

  /* The current page is underlined in copper, set a little below the words. */
  a[aria-current='page']::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block-end: -0.25rem;
    block-size: ${t.strokeWidth.rule};
    border-radius: ${t.radius.chip};
    background: ${t.accent.default};
  }
`;

const Search = styled(SearchField)`
  justify-self: end;
  max-inline-size: 26rem;
`;

/* The phone's menu is a popover: it opens without a script, Esc closes it and
   focus goes back to the button that opened it. */
const Sheet = styled.div`
  inset: 0;
  inline-size: 100%;
  max-inline-size: none;
  block-size: 100dvh;
  max-block-size: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${t.surface.page};
  color: ${t.text.primary};

  &:popover-open {
    display: grid;
    grid-template-rows: auto 1fr;
  }
`;

const SheetHead = styled.div`
  ${inline}
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-block-size: 4rem;
  border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
`;

const SheetBody = styled.div`
  ${inline}
  display: grid;
  align-content: start;
  gap: ${t.space.gapXl};
  padding-block: ${t.space.gapLg};
  overflow-y: auto;
`;

const SheetNav = styled.nav`
  ul {
    display: grid;
  }

  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-block: ${t.space.gapMd};
    border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
    ${typeRole('heading3')}
    text-decoration: none;
  }

  a[aria-current='page'] {
    color: ${t.text.accent};
  }

  svg {
    color: ${t.icon.secondary};
  }
`;

const SheetLinks = styled.ul`
  display: grid;
  gap: ${t.space.gapXs};

  > li > a,
  > li > button {
    display: flex;
    align-items: center;
    gap: ${t.space.gapSm};
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: 0;
    border: 0;
    background: none;
    font-size: 1rem;
    font-weight: 500;
    text-align: start;
    text-decoration: none;
  }

  svg {
    color: ${t.icon.secondary};
  }
`;

/* The store's languages in two letters each: the current one is marked as the
   menu marks its page, and the other leads to the same page in it. */
const Codes = styled.nav`
  display: flex;
  align-items: center;

  a {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-block-size: 2.75rem;
    padding-inline: ${t.space.gapXs};
    color: ${t.text.secondary};
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-decoration: none;
  }

  a:hover,
  a[aria-current='true'] {
    color: ${t.text.primary};
  }

  a + a::before {
    content: '';
    position: absolute;
    inset-inline-start: 0;
    inset-block: 36%;
    inline-size: ${t.strokeWidth.hairline};
    background: ${t.stroke.default};
  }

  a[aria-current='true']::after {
    content: '';
    position: absolute;
    inset-inline: ${t.space.gapXs};
    inset-block-end: 0.5rem;
    block-size: ${t.strokeWidth.rule};
    border-radius: ${t.radius.chip};
    background: ${t.accent.default};
  }
`;

/* In the phone's sheet the switch is a row of its own, named, like the theme's. */
const SheetCodes = styled.div`
  display: flex;
  align-items: center;
  gap: ${t.space.gapSm};
  min-block-size: 2.75rem;
  font-weight: 500;

  > nav {
    margin-inline-start: auto;
  }
`;

export interface LanguageOption {
  /** The language's name, as its own readers write it: "English", "Português". */
  readonly name: string;
  /** Two letters, all the switch shows of it: "EN", "PT". */
  readonly short: string;
  /** Its BCP 47 tag: "en", "pt-BR". */
  readonly lang: string;
  /** The page the reader is on, in that language. */
  readonly href: string;
  readonly current?: boolean;
}

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly current?: boolean;
}

export interface SiteHeaderProps {
  home: { href: string; label: string };
  nav: { label: string; items: readonly NavItem[] };
  search: SearchFieldProps;
  theme: { label: string; onToggle?: () => void };
  /** Left out while a shop has no accounts: a link must lead to a page. */
  account?: { label: string; href: string };
  /** Left out while a shop has no cart. */
  cart?: { label: string; href: string; count: number };
  menu: { open: string; close: string };
  /** A sheet laid under the bar, such as what was just added to the cart: it follows the bar as it sticks. */
  notice?: ReactNode;
  /**
   * The switch between the store's languages, a `LanguageCodes`: in the bar on
   * a laptop, in a row of the sheet on a phone, named by the label there.
   */
  languages?: { label: string; codes: ReactNode };
}

export interface LanguageCodesProps {
  /** What the switch is, for a screen reader: "Language". */
  label: string;
  items: readonly LanguageOption[];
  /** As the reader follows the link to another language, before the browser leaves. */
  onFollow?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * The switch between the store's languages, two letters each. A screen reader
 * hears each language's name as well, said in that language.
 */
export function LanguageCodes({ label, items, onFollow }: LanguageCodesProps) {
  return (
    <Codes aria-label={label}>
      {items.map((item) => (
        <a
          key={item.lang}
          href={item.href}
          lang={item.lang}
          hrefLang={item.current ? undefined : item.lang}
          aria-current={item.current ? 'true' : undefined}
          onClick={item.current ? undefined : onFollow}
        >
          {item.short}
          <VisuallyHidden> {item.name}</VisuallyHidden>
        </a>
      ))}
    </Codes>
  );
}

/**
 * The bar at the top of every page, sticky. On a laptop it shows everything;
 * on a phone the logo, search and cart stay, and the rest opens as a sheet.
 */
export function SiteHeader({
  home,
  nav,
  search,
  theme,
  account,
  cart,
  menu,
  notice,
  languages,
}: SiteHeaderProps) {
  const menuId = useId();
  const links = (inSheet: boolean) =>
    nav.items.map((item) => (
      <li key={item.href}>
        <a href={item.href} aria-current={item.current ? 'page' : undefined}>
          {item.label}
          {inSheet && <Icon name="chevron" size="small" />}
        </a>
      </li>
    ));

  return (
    <Bar>
      <Narrow>
        <IconButton icon="menu" label={menu.open} popoverTarget={menuId} />
      </Narrow>
      <Logo href={home.href} aria-label={home.label} />
      <Wide>
        <Nav aria-label={nav.label}>
          <ul>{links(false)}</ul>
        </Nav>
        <Search {...search} />
      </Wide>
      <Tools>
        <Wide>
          {languages?.codes}
          <IconButton icon="theme" label={theme.label} onClick={theme.onToggle} />
          {account && <IconLink icon="user" label={account.label} href={account.href} />}
        </Wide>
        <Narrow>
          <IconLink icon="search" label={search.label} href={search.action} />
        </Narrow>
        {cart && <IconLink icon="bag" label={cart.label} href={cart.href} badge={cart.count} />}
      </Tools>

      <Sheet id={menuId} popover="auto">
        <SheetHead>
          <Logo href={home.href} aria-label={home.label} />
          <IconButton
            icon="close"
            label={menu.close}
            popoverTarget={menuId}
            popoverTargetAction="hide"
          />
        </SheetHead>
        <SheetBody>
          <SearchField {...search} shortcut={undefined} />
          <SheetNav aria-label={nav.label}>
            <ul>{links(true)}</ul>
          </SheetNav>
          <SheetLinks>
            {account && (
              <li>
                <a href={account.href}>
                  <Icon name="user" />
                  {account.label}
                </a>
              </li>
            )}
            <li>
              <button type="button" onClick={theme.onToggle}>
                <Icon name="theme" />
                {theme.label}
              </button>
            </li>
            {languages && (
              <li>
                <SheetCodes>
                  <Icon name="language" />
                  {languages.label}
                  {languages.codes}
                </SheetCodes>
              </li>
            )}
          </SheetLinks>
        </SheetBody>
      </Sheet>
      {notice}
    </Bar>
  );
}
