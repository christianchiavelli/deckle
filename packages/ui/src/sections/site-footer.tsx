import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Logo } from '../components/logo/logo.tsx';
import { inline } from './band.tsx';

const Footer = styled.footer`
  ${inline}
  padding-block: ${t.space.gap3xl};
  background: ${t.surface.deep};
  color: ${t.text.onDeep};
  font-size: 0.875rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${t.space.gap2xl} ${t.space.gapXl};

  @media ${media.md} {
    grid-template-columns: minmax(0, 4fr) minmax(0, 4fr) minmax(0, 4fr);
  }
`;

const Brand = styled.div`
  grid-column: 1 / -1;
  display: grid;
  align-content: start;
  gap: ${t.space.gapSm};
  max-inline-size: 30ch;
  color: ${t.text.onDeepSecondary};

  @media ${media.md} {
    grid-column: auto;
  }
`;

/* One landmark for the footer's links, its columns inside: a second "Shop"
   navigation would sound the same as the header's to a screen reader. */
const Nav = styled.nav`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${t.space.gapXl};

  @media ${media.md} {
    grid-column: auto;
  }
`;

const Column = styled.div`
  display: grid;
  align-content: start;
  gap: ${t.space.gapSm};

  h2 {
    font-size: inherit;
    font-weight: ${t.type.label.weight};
  }

  ul {
    display: grid;
    gap: ${t.space.gapXs};
    color: ${t.text.onDeepSecondary};
  }

  a {
    text-decoration: none;
  }

  a:hover {
    color: ${t.text.onDeep};
  }
`;

const Small = styled.p`
  grid-column: 1 / -1;
  color: ${t.text.onDeepSecondary};

  @media ${media.md} {
    grid-column: auto;
  }
`;

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly { readonly label: string; readonly href: string }[];
}

export interface SiteFooterProps {
  home: { href: string; label: string };
  /** The footer navigation's name: "Footer". */
  label: string;
  /** One sentence on what Deckle is. */
  about: ReactNode;
  columns: readonly FooterColumn[];
  /** Image credits, and the note that nothing here ships. */
  small: ReactNode;
}

/** The ink-dark foot of every page: what Deckle is, where to go, whose images these are. */
export function SiteFooter({ home, label, about, columns, small }: SiteFooterProps) {
  return (
    <Footer>
      <Grid>
        <Brand>
          <Logo href={home.href} aria-label={home.label} onDeep />
          <p>{about}</p>
        </Brand>
        <Nav aria-label={label}>
          {columns.map((column) => (
            <Column key={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </Column>
          ))}
        </Nav>
        <Small>{small}</Small>
      </Grid>
    </Footer>
  );
}
