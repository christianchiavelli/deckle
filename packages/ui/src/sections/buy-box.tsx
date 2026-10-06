import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Icon } from '../components/icon/icon.tsx';
import type { IconName } from '../components/icon/icons.tsx';
import { typeRole } from '../theme/type.ts';

/** The column beside the print: everything needed to choose and buy it, held in view as the print scrolls. */
export const BuyBox = styled.div`
  display: grid;
  align-content: start;
  gap: ${t.space.gapLg};

  > button {
    inline-size: 100%;
  }

  @media ${media.md} {
    position: sticky;
    inset-block-start: 6rem;
  }
`;

const Heading = styled.div`
  display: grid;
  gap: ${t.space.gapXs};
`;

const Artist = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 ${t.space.gapXs};
  font-size: 0.9375rem;

  a,
  strong {
    color: ${t.text.accent};
    font-weight: ${t.type.label.weight};
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  span {
    color: ${t.text.secondary};
  }
`;

const Title = styled.h1`
  ${typeRole('display')}
  text-wrap: balance;
`;

const Facts = styled.p`
  margin-block-start: ${t.space.gap2xs};
  color: ${t.text.secondary};
  font-size: 0.9375rem;
`;

export interface WorkHeadingProps {
  /** The title's id, for the band that it names. */
  id: string;
  /** Without `href`, the name is not a link: there is no page of the artist's to open. */
  artist: { name: string; href?: string | undefined; bio: string };
  title: string;
  /** Date, technique and size of the original, as one line: "1514 · Engraving · Plate 24 × 18.5 cm". */
  facts: string;
}

/** Who made the work, its title, and the facts of the original. The page's only `h1`. */
export function WorkHeading({ id, artist, title, facts }: WorkHeadingProps) {
  return (
    <Heading>
      <Artist>
        {artist.href === undefined ? (
          <strong>{artist.name}</strong>
        ) : (
          <a href={artist.href}>{artist.name}</a>
        )}
        <span>{artist.bio}</span>
      </Artist>
      <Title id={id}>{title}</Title>
      <Facts>{facts}</Facts>
    </Heading>
  );
}

/** The price, set off from the choices under it by a hairline. */
export const PriceRule = styled.div`
  padding-block-end: ${t.space.gapLg};
  border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
`;

const Callout = styled.a`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: ${t.space.gapSm};
  padding: 0.875rem ${t.space.gapMd};
  border-radius: ${t.radius.control};
  box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.subtle};
  text-decoration: none;
  transition: box-shadow ${t.motion.feedback} ${t.motion.easing};

  &:hover {
    box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.strong};
  }

  > svg {
    color: ${t.icon.secondary};
  }
`;

const CalloutIcon = styled.span`
  display: grid;
  place-items: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: 50%;
  background: ${t.accent.subtle};
  color: ${t.icon.accent};
`;

const CalloutText = styled.span`
  display: grid;
  font-size: 0.875rem;
  line-height: 1.4;

  strong {
    font-weight: ${t.type.label.weight};
  }

  span {
    color: ${t.text.secondary};
  }
`;

export interface EditionCalloutProps {
  href: string;
  title: string;
  detail: string;
}

/** A pointer from the open edition to the numbered one, when a drop of this work is coming. */
export function EditionCallout({ href, title, detail }: EditionCalloutProps) {
  return (
    <Callout href={href}>
      <CalloutIcon>
        <Icon name="key" size="small" />
      </CalloutIcon>
      <CalloutText>
        <strong>{title}</strong>
        <span>{detail}</span>
      </CalloutText>
      <Icon name="chevron" size="small" />
    </Callout>
  );
}

const List = styled.ul`
  display: grid;
  gap: ${t.space.gapSm};
  padding-block-start: ${t.space.gapXs};
  color: ${t.text.secondary};
  font-size: 0.875rem;

  li {
    display: flex;
    align-items: center;
    gap: ${t.space.gapSm};
  }

  svg {
    color: ${t.icon.primary};
  }
`;

export interface Assurance {
  readonly icon: IconName;
  readonly text: ReactNode;
}

/** What is true of every print: the resolution, the paper, the rights. Facts, not promises. */
export function Assurances({ items }: { items: readonly Assurance[] }) {
  return (
    <List>
      {items.map((item) => (
        <li key={item.icon}>
          <Icon name={item.icon} size="small" />
          <span>{item.text}</span>
        </li>
      ))}
    </List>
  );
}
