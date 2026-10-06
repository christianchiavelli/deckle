import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled, { css } from 'styled-components';

/**
 * `neutral` for facts (a scan's size, a print's ppi), `accent` for what is
 * about to open, `soft` for a quieter accent such as "A4 only".
 */
export type ChipTone = 'neutral' | 'accent' | 'soft';

const tones = {
  neutral: css`
    background: ${t.surface.sheet};
    color: ${t.text.secondary};
  `,
  accent: css`
    background: ${t.accent.default};
    color: ${t.text.onAccent};
  `,
  soft: css`
    background: ${t.accent.subtle};
    color: ${t.text.accent};
  `,
};

const Pill = styled.span<{ $tone: ChipTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${t.space.gap2xs};
  padding: 0.125rem 0.625rem;
  border-radius: ${t.radius.chip};
  font-size: 0.75rem;
  font-weight: ${t.type.label.weight};
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  ${({ $tone }) => tones[$tone]}
`;

export type ChipProps = ComponentPropsWithRef<'span'> & { tone?: ChipTone };

/** A short fact in a pill. Figures line up, so a column of chips reads as a table. */
export function Chip({ tone = 'neutral', ...rest }: ChipProps) {
  return <Pill $tone={tone} {...rest} />;
}
