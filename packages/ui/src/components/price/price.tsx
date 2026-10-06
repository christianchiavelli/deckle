import { tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { formatMoney } from '../../format.ts';
import { Missing } from '../missing/missing.tsx';

const Line = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${t.space.gapSm};
`;

const Amount = styled.span`
  font-size: 1.75rem;
  font-weight: ${t.type.heading2.weight};
  letter-spacing: ${t.type.heading2.tracking};
  font-variant-numeric: tabular-nums;
`;

const Detail = styled.span`
  color: ${t.text.secondary};
  font-size: 0.875rem;
`;

export interface PriceProps {
  /** In minor units, as commerce returns it. `null` when it has none: a dash, never a zero. */
  amount: number | null;
  currency: string;
  locale: string;
  /** What the dash means, read aloud in its place. */
  missing: string;
  /** What the price is for, such as "A3, unframed". */
  children?: ReactNode;
  className?: string;
}

/** The price of the print being chosen, large, with what it buys beside it. */
export function Price({ amount, currency, locale, missing, children, className }: PriceProps) {
  return (
    <Line className={className}>
      <Amount>
        {amount === null ? <Missing label={missing} /> : formatMoney(amount, currency, locale)}
      </Amount>
      {children && <Detail>{children}</Detail>}
    </Line>
  );
}
