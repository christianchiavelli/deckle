import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled, { css } from 'styled-components';
import { Icon } from '../icon/icon.tsx';
import type { IconName } from '../icon/icons.tsx';

const iconButton = css`
  position: relative;
  display: inline-grid;
  place-items: center;
  /* 44 px: the smallest target a finger hits reliably. */
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border: 0;
  border-radius: ${t.radius.chip};
  background: none;
  color: ${t.icon.primary};
  cursor: pointer;
  transition: background-color ${t.motion.feedback} ${t.motion.easing};

  &:hover {
    background: ${t.action.secondaryHover};
  }
`;

const NativeButton = styled.button`
  ${iconButton}
`;

const Anchor = styled.a`
  ${iconButton}
`;

const Badge = styled.span`
  position: absolute;
  inset-block-start: 0.25rem;
  inset-inline-end: 0.125rem;
  display: grid;
  place-items: center;
  min-inline-size: 1.125rem;
  block-size: 1.125rem;
  padding-inline: 0.25rem;
  border-radius: ${t.radius.chip};
  background: ${t.accent.default};
  color: ${t.text.onAccent};
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

interface Own {
  icon: IconName;
  /** Its name for screen readers, which see no icon. Say what the badge counts, too. */
  label: string;
  /** A count drawn on the icon, such as the prints in the cart. Hidden at zero. */
  badge?: number;
}

function Content({ icon, badge }: Omit<Own, 'label'>) {
  return (
    <>
      <Icon name={icon} />
      {badge !== undefined && badge > 0 && <Badge aria-hidden="true">{badge}</Badge>}
    </>
  );
}

export type IconButtonProps = Own &
  Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'>;

/** An action that is only an icon: the header's theme and account buttons. */
export function IconButton({ icon, label, badge, type = 'button', ...rest }: IconButtonProps) {
  return (
    <NativeButton type={type} aria-label={label} {...rest}>
      <Content icon={icon} badge={badge} />
    </NativeButton>
  );
}

export type IconLinkProps = Own & Omit<ComponentPropsWithRef<'a'>, 'children' | 'aria-label'>;

/** A link that is only an icon, such as the cart, which is a page. */
export function IconLink({ icon, label, badge, ...rest }: IconLinkProps) {
  return (
    <Anchor aria-label={label} {...rest}>
      <Content icon={icon} badge={badge} />
    </Anchor>
  );
}
