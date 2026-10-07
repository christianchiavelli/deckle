import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Icon } from '../components/icon/icon.tsx';
import { typeRole } from '../theme/type.ts';
import { type Detail, DetailImage } from './detail-image.tsx';

const Card = styled.a`
  display: grid;
  align-content: start;
  gap: ${t.space.gapXs};
  text-decoration: none;

  > span:first-child {
    margin-block-end: ${t.space.gapSm};
    border-radius: ${t.radius.frame};
  }

  h3 {
    ${typeRole('heading3')}
  }

  &:hover h3 {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  p {
    display: -webkit-box;
    overflow: hidden;
    color: ${t.text.secondary};
    font-size: 0.9375rem;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
`;

const Kicker = styled.span`
  color: ${t.text.accent};
  font-size: 0.8125rem;
  font-weight: ${t.type.label.weight};
`;

export interface StoryCardProps {
  href: string;
  /** What the story is, above its title: "About the engraving". */
  kicker: string;
  /** The work the story tells about, which names the card. */
  title: string;
  /** The story's opening lines; a story may have none. */
  lede: string | null;
  image: { src: string; width: number; height: number; detail: Detail };
}

/** A story from the journal: a detail of the work, what the story is, the work's name and first lines. */
export function StoryCard({ href, kicker, title, lede, image }: StoryCardProps) {
  return (
    <Card href={href}>
      <DetailImage {...image} alt="" aspect={4 / 3} />
      <Kicker>{kicker}</Kicker>
      <h3>{title}</h3>
      {lede && <p>{lede}</p>}
    </Card>
  );
}

/** Stories one above the other on a phone, three across on a laptop. */
export const StoryGrid = styled.ul`
  display: grid;
  gap: ${t.space.gap2xl};

  @media ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${t.space.gapXl};
  }
`;

const Lead = styled.a`
  display: grid;
  gap: ${t.space.gapLg};
  text-decoration: none;

  @media ${media.md} {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: ${t.space.gap3xl};
    align-items: center;
  }

  > span:first-child {
    border-radius: ${t.radius.frame};
  }

  h2 {
    ${typeRole('heading1')}
    text-wrap: balance;
  }

  &:hover h2 {
    text-decoration: underline;
    text-decoration-thickness: ${t.strokeWidth.hairline};
    text-underline-offset: 0.15em;
  }

  p {
    color: ${t.text.secondary};
    font-size: 1.125rem;
  }
`;

const LeadCopy = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapMd};
`;

/* Looks like a text link; the whole card is the one link. */
const More = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${t.space.gap2xs};
  color: ${t.text.accent};
  font-size: 0.9375rem;
  font-weight: ${t.type.label.weight};
`;

export interface StoryLeadProps extends StoryCardProps {
  /** Under the lede, where the link goes: "Read it beside the print". */
  more: string;
}

/** The journal's first story, wide: a larger detail, the work's name as a headline. */
export function StoryLead({ href, kicker, title, lede, image, more }: StoryLeadProps) {
  return (
    <Lead href={href}>
      <DetailImage {...image} alt="" aspect={3 / 2} />
      <LeadCopy>
        <Kicker>{kicker}</Kicker>
        <h2>{title}</h2>
        {lede && <p>{lede}</p>}
        <More>
          {more}
          <Icon name="arrow" size="small" />
        </More>
      </LeadCopy>
    </Lead>
  );
}
