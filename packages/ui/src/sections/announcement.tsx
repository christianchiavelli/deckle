import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Icon } from '../components/icon/icon.tsx';
import type { IconName } from '../components/icon/icons.tsx';

const Bar = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${t.space.gap2xs} ${t.space.gapXs};
  min-block-size: 2.5rem;
  padding: ${t.space.gapXs} ${t.space.gapLg};
  background: ${t.component.announce.surface};
  color: ${t.component.announce.text};
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;

  /* On a phone the line wraps, and the icon would stand alone above it. */
  > svg {
    display: none;

    @media ${media.sm} {
      display: block;
    }
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: ${t.type.label.weight};
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
`;

export interface AnnouncementProps {
  icon?: IconName;
  children: ReactNode;
  href: string;
  /** The link's words, which say where it goes: "See the drop". */
  link: string;
}

/** One line above the header for the one thing worth knowing today: a drop about to open. */
export function Announcement({ icon = 'key', children, href, link }: AnnouncementProps) {
  return (
    <Bar>
      <Icon name={icon} size="small" />
      <span>{children}</span>
      <a href={href}>
        {link}
        <Icon name="arrow" size="small" />
      </a>
    </Bar>
  );
}
