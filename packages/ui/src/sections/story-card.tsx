import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
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
  /** The work the story is about. */
  work: string;
  title: string;
  lede: string;
  image: { src: string; width: number; height: number; detail: Detail };
}

/** A story from the journal: a detail of the work, its name, the story's title and first lines. */
export function StoryCard({ href, work, title, lede, image }: StoryCardProps) {
  return (
    <Card href={href}>
      <DetailImage {...image} alt="" aspect={4 / 3} />
      <Kicker>{work}</Kicker>
      <h3>{title}</h3>
      <p>{lede}</p>
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
