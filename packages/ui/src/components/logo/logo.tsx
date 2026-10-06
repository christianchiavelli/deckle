import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';

const Anchor = styled.a<{ $onDeep: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${t.space.gapXs};
  color: ${({ $onDeep }) => ($onDeep ? t.text.onDeep : 'inherit')};
  font-family: ${t.type.display.family};
  font-size: 1.375rem;
  font-weight: ${t.type.display.weight};
  letter-spacing: ${t.type.display.tracking};
  line-height: 1;
  text-decoration: none;

  svg {
    color: ${({ $onDeep }) => ($onDeep ? 'currentColor' : t.icon.accent)};
  }
`;

export type LogoProps = ComponentPropsWithRef<'a'> & {
  /** In the footer, on the deep band: the mark takes the text's colour instead of the copper. */
  onDeep?: boolean;
};

/** The mark, a sheet with its deckled edge, and the name. Always a link home. */
export function Logo({ onDeep = false, ...rest }: LogoProps) {
  return (
    <Anchor $onDeep={onDeep} {...rest}>
      <Icon name="deckle" />
      <span>Deckle</span>
    </Anchor>
  );
}
