import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled, { css } from 'styled-components';
import { Icon } from '../icon/icon.tsx';
import type { IconName } from '../icon/icons.tsx';

/**
 * `primary` is the ink of the page, for the one action a screen leads to.
 * `accent` is the drop's copper, for what opens, counts down or is numbered.
 */
export type ButtonVariant = 'primary' | 'accent';

const variants = {
  primary: css`
    background: ${t.action.primary};
    color: ${t.text.onAction};

    &:hover:not(:disabled) {
      background: ${t.action.primaryHover};
    }
  `,
  accent: css`
    background: ${t.accent.default};
    color: ${t.text.onAccent};

    /* Towards the ink in light and towards the paper in dark: darker or
       lighter, the label keeps its contrast either way. */
    &:hover:not(:disabled) {
      background: color-mix(in srgb, ${t.accent.default} 86%, ${t.text.primary});
    }
  `,
};

const button = css<{ $variant: ButtonVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${t.space.gapXs};
  min-block-size: 3.5rem;
  padding-inline: ${t.space.gapXl};
  border: 0;
  border-radius: ${t.radius.control};
  font-family: ${t.type.label.family};
  font-size: 1rem;
  font-weight: ${t.type.label.weight};
  text-decoration: none;
  cursor: pointer;
  transition: background-color ${t.motion.feedback} ${t.motion.easing};
  ${({ $variant }) => variants[$variant]}

  &:disabled {
    background: ${t.surface.sheet};
    color: ${t.text.muted};
    cursor: not-allowed;
  }
`;

const NativeButton = styled.button<{ $variant: ButtonVariant }>`
  ${button}
`;

const Anchor = styled.a<{ $variant: ButtonVariant }>`
  ${button}
`;

interface Own {
  variant?: ButtonVariant;
  /** Drawn before the label, at the size that matches it. */
  icon?: IconName;
}

export type ButtonProps = Own & ComponentPropsWithRef<'button'>;

/** An action on this page. For a link that looks like one, see `ButtonLink`. */
export function Button({
  variant = 'primary',
  icon,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <NativeButton $variant={variant} type={type} {...rest}>
      {icon && <Icon name={icon} size="small" />}
      {children}
    </NativeButton>
  );
}

export type ButtonLinkProps = Own & ComponentPropsWithRef<'a'>;

/** A link drawn as a button: it goes somewhere, so it stays an `<a>`. */
export function ButtonLink({ variant = 'primary', icon, children, ...rest }: ButtonLinkProps) {
  return (
    <Anchor $variant={variant} {...rest}>
      {icon && <Icon name={icon} size="small" />}
      {children}
    </Anchor>
  );
}
