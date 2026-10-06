import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';

/* The name set as a printer's imprint: capitals, spaced wide. */
const tracking = '0.22em';

const Anchor = styled.a<{ $onDeep: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: ${({ $onDeep }) => ($onDeep ? t.text.onDeep : 'inherit')};
  font-family: ${t.type.label.family};
  font-size: 1.0625rem;
  font-weight: ${t.type.label.weight};
  letter-spacing: ${tracking};
  line-height: 1;
  text-decoration: none;
  text-transform: uppercase;

  svg {
    inline-size: 1.75rem;
    block-size: 1.75rem;
    color: ${({ $onDeep }) => ($onDeep ? 'currentColor' : t.icon.accent)};
  }

  /* Spacing trails the last letter too: take it back, so the name ends at its E. */
  span {
    margin-inline-end: calc(-1 * ${tracking});
  }
`;

export type LogoProps = ComponentPropsWithRef<'a'> & {
  /** In the footer, on the deep band: the mark takes the text's colour instead of the copper. */
  onDeep?: boolean;
};

/** The seal and the name, always a link home. Screen readers hear "Deckle", not the capitals. */
export function Logo({ onDeep = false, ...rest }: LogoProps) {
  return (
    <Anchor $onDeep={onDeep} {...rest}>
      <Icon name="deckle" />
      <span>Deckle</span>
    </Anchor>
  );
}
