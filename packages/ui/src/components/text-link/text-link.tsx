import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';
import type { IconName } from '../icon/icons.tsx';

/** `accent` on the page's own surfaces; `onFeature` on the copper-dark band of a drop. */
export type TextLinkTone = 'accent' | 'onFeature';

const Anchor = styled.a<{ $tone: TextLinkTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${t.space.gap2xs};
  color: ${({ $tone }) => ($tone === 'accent' ? t.text.accent : t.text.onFeature)};
  font-size: 0.9375rem;
  font-weight: ${t.type.label.weight};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 0.25em;
  }
`;

export type TextLinkProps = ComponentPropsWithRef<'a'> & {
  tone?: TextLinkTone;
  /** Drawn after the words: `arrow` to go on, `chevron` to open, `out` to leave the store. */
  icon?: IconName;
};

/** A link that stands alone in copy or under a section, in the accent colour. */
export function TextLink({ tone = 'accent', icon, children, ...rest }: TextLinkProps) {
  return (
    <Anchor $tone={tone} {...rest}>
      {children}
      {icon && <Icon name={icon} size="small" />}
    </Anchor>
  );
}
