import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { typeRole } from '../theme/type.ts';

/* A cart line: the print on its mat, what it is, how many, and what they cost.
   Where the list is narrow, on a phone or beside a checkout's form, the
   quantity and the total drop under the words: the list's own width decides,
   not the screen's. */
const Lines = styled.ul`
  container-type: inline-size;
  display: grid;
  border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
`;

const WIDE = '(min-width: 34rem)';

const Line = styled.li`
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: ${t.space.gapMd};
  padding-block: ${t.space.gapLg};
  border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};

  @container ${WIDE} {
    grid-template-columns: 7rem minmax(0, 1fr) auto 7rem;
    align-items: center;
    column-gap: ${t.space.gapLg};
  }
`;

const Mat = styled.a`
  display: block;
  aspect-ratio: 1;
  padding: 0.5rem;
  border-radius: ${t.radius.control};
  background: ${t.surface.stage};

  img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
  }
`;

const Words = styled.div`
  display: grid;
  align-content: start;
  gap: ${t.space.gap2xs};
  min-inline-size: 0;

  p {
    color: ${t.text.secondary};
    font-size: 0.875rem;
  }
`;

const Title = styled.h2`
  ${typeRole('heading3')}

  a {
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
`;

const Size = styled.p`
  && {
    color: ${t.text.primary};
  }
`;

const Remove = styled.div`
  margin-block-start: ${t.space.gapXs};
`;

const Amounts = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${t.space.gapMd};
  grid-column: 2;

  @container ${WIDE} {
    display: contents;
  }
`;

const Total = styled.p`
  font-size: 1.0625rem;
  font-variant-numeric: tabular-nums;
  font-weight: ${t.type.label.weight};
  text-align: end;
`;

export interface CartLineProps {
  /** The work's page. */
  href: string;
  image: { src: string; width: number; height: number } | null;
  title: string;
  /** "Albrecht Dürer, 1514". */
  meta: string;
  /** "A3, unframed · $90 each". */
  size: string;
  /** The quantity control. */
  quantity: ReactNode;
  /** What the line comes to. */
  total: string;
  /** The way to take the line out. */
  remove: ReactNode;
  /** The title's level: under the page's heading, or under a summary's. */
  level?: 'h2' | 'h3';
}

/** The lines of a cart or an order, top to bottom. */
export function CartLines({ children }: { children: ReactNode }) {
  return <Lines>{children}</Lines>;
}

/** One print in a cart, at one size. */
export function CartLine({
  href,
  image,
  title,
  meta,
  size,
  quantity,
  total,
  remove,
  level = 'h2',
}: CartLineProps) {
  return (
    <Line>
      {/* The title links to the same page; one link per print is enough for a keyboard. */}
      <Mat href={href} tabIndex={-1} aria-hidden="true">
        {image && <img src={image.src} width={image.width} height={image.height} alt="" />}
      </Mat>
      <Words>
        <Title as={level}>
          <a href={href}>{title}</a>
        </Title>
        <p>{meta}</p>
        <Size>{size}</Size>
        <Remove>{remove}</Remove>
      </Words>
      <Amounts>
        {quantity}
        <Total>{total}</Total>
      </Amounts>
    </Line>
  );
}

const Summary = styled.aside`
  display: grid;
  align-content: start;
  gap: ${t.space.gapLg};
  padding: ${t.space.gapXl};
  border-radius: ${t.radius.frame};
  background: ${t.surface.band};

  h2 {
    ${typeRole('heading3')}
  }

  @media ${media.md} {
    position: sticky;
    inset-block-start: 6rem;
  }
`;

const Rows = styled.dl`
  display: grid;
  gap: ${t.space.gapSm};

  > div {
    display: flex;
    justify-content: space-between;
    gap: ${t.space.gapMd};
  }

  dt {
    color: ${t.text.secondary};
  }

  dd {
    font-variant-numeric: tabular-nums;
    text-align: end;
  }

  /* The total closes the sum, under a rule, in the label's weight. */
  > div:last-child {
    margin-block-start: ${t.space.gapXs};
    padding-block-start: ${t.space.gapSm};
    border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.default};
    font-size: 1.125rem;
    font-weight: ${t.type.label.weight};
  }

  > div:last-child dt {
    color: ${t.text.primary};
  }
`;

export interface SummaryRow {
  readonly label: string;
  readonly value: string;
}

export interface OrderSummaryProps {
  id: string;
  title: string;
  /** What is in the order, above its sum, where the lines are not beside it. */
  lines?: ReactNode;
  /** The sum, line by line; the last row is the total. */
  rows: readonly SummaryRow[];
  /** The action the sum leads to, and what to know before taking it. */
  children?: ReactNode;
}

/** What an order comes to, held beside its lines as they scroll. */
export function OrderSummary({ id, title, lines, rows, children }: OrderSummaryProps) {
  return (
    <Summary aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {lines}
      <Rows>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </Rows>
      {children}
    </Summary>
  );
}
