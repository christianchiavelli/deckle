import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled, { css } from 'styled-components';
import { Icon } from '../icon/icon.tsx';
import type { IconName } from '../icon/icons.tsx';

/** `accent` on the page's own surfaces; `onFeature` on the copper-dark band of a drop. */
export type TextLinkTone = 'accent' | 'onFeature';

const words = css<{ $tone: TextLinkTone }>`
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

const Anchor = styled.a<{ $tone: TextLinkTone }>`
  ${words}
`;

const Native = styled.button<{ $tone: TextLinkTone }>`
  ${words}
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  cursor: pointer;

  &:disabled {
    color: ${t.text.muted};
    text-decoration: none;
    cursor: not-allowed;
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

export type TextButtonProps = ComponentPropsWithRef<'button'> & {
  tone?: TextLinkTone;
  icon?: IconName;
};

/** An action that reads as a link beside the one a page leads to: "Remove", "Let it go". */
export function TextButton({
  tone = 'accent',
  icon,
  type = 'button',
  children,
  ...rest
}: TextButtonProps) {
  return (
    <Native $tone={tone} type={type} {...rest}>
      {children}
      {icon && <Icon name={icon} size="small" />}
    </Native>
  );
}
