import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';

const Box = styled.p`
  display: flex;
  gap: ${t.space.gapXs};
  padding: ${t.space.gapSm} 0.875rem;
  border-radius: ${t.radius.control};
  background: ${t.surface.sheet};
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  line-height: 1.5;

  svg {
    /* Optical: the circle's top meets the first line's cap height. */
    margin-block-start: 0.0625rem;
    color: ${t.icon.secondary};
  }
`;

export type NoteProps = ComponentPropsWithRef<'p'>;

/** Why something is the way it is, in a sentence: a size the scan cannot reach, say. */
export function Note({ children, ...rest }: NoteProps) {
  return (
    <Box {...rest}>
      <Icon name="info" size="small" />
      <span>{children}</span>
    </Box>
  );
}
