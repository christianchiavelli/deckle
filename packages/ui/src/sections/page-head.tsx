import { tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { typeRole } from '../theme/type.ts';

const Head = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};

  h1 {
    ${typeRole('heading1')}
    max-inline-size: 20ch;
    text-wrap: balance;
  }
`;

const Lede = styled.p`
  max-inline-size: 52ch;
  color: ${t.text.secondary};
  font-size: 1.125rem;
`;

export interface PageHeadProps {
  /** The heading's id, for the band's `aria-labelledby`. */
  id: string;
  title: ReactNode;
  /** A line on what the page holds. */
  lede?: ReactNode;
  /** Above the title: where the page sits, as breadcrumbs. */
  crumbs?: ReactNode;
  /** Under the lede: the page's own controls, such as its filters or a search field. */
  children?: ReactNode;
}

/** The top of a page that lists or explains: its title, a line on what it holds, its controls. */
export function PageHead({ id, title, lede, crumbs, children }: PageHeadProps) {
  return (
    <Head>
      {crumbs}
      <h1 id={id}>{title}</h1>
      {lede && <Lede>{lede}</Lede>}
      {children}
    </Head>
  );
}
