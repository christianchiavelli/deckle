import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { typeRole } from '../theme/type.ts';
import { type Detail, DetailImage } from './detail-image.tsx';

const Grid = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  align-items: center;

  @media ${media.md} {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: ${t.space.gap3xl};
  }
`;

/* Without a detail to show, the text keeps its measure and the band its rhythm. */
const Alone = styled.div`
  display: grid;
`;

const Lede = styled.p`
  font-size: 1.375rem;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: -0.01em;
`;

const Text = styled.div`
  display: grid;
  gap: ${t.space.gapMd};
  max-inline-size: 60ch;

  h2 {
    ${typeRole('heading2')}
    margin-block-end: ${t.space.gapXs};
  }

  h3 {
    ${typeRole('heading3')}
    margin-block-start: ${t.space.gapSm};
  }

  p:not(${Lede}) {
    color: ${t.text.secondary};
  }

  blockquote {
    padding-inline-start: ${t.space.gapMd};
    border-inline-start: ${t.strokeWidth.rule} solid ${t.stroke.accent};
  }

  blockquote p:not(${Lede}) {
    color: ${t.text.primary};
  }
`;

const Source = styled.p`
  font-size: 0.8125rem;
`;

const Figure = styled.figure`
  display: grid;
  gap: ${t.space.gapSm};

  > span {
    border-radius: ${t.radius.frame};
  }

  figcaption {
    color: ${t.text.secondary};
    font-size: 0.8125rem;
  }
`;

export interface StoryFigure {
  src: string;
  width: number;
  height: number;
  alt: string;
  detail: Detail;
  caption: string;
}

export interface StoryProps {
  id: string;
  title: string;
  /** The opening sentences, set larger; null when the story has none. */
  lede: string | null;
  /** The body: paragraphs, and the headings (level 3) and quotes a story may hold. */
  children: ReactNode;
  /** Where the facts come from, as the CMS requires for every story. */
  source: ReactNode;
  /** The detail the story talks about. Without one, the text has the band to itself. */
  figure?: StoryFigure | undefined;
}

/** The work's story from the CMS, beside the detail it talks about. */
export function Story({ id, title, lede, children, source, figure }: StoryProps) {
  const text = (
    <Text>
      <h2 id={id}>{title}</h2>
      {lede !== null && <Lede>{lede}</Lede>}
      {children}
      <Source>{source}</Source>
    </Text>
  );
  if (!figure) {
    return <Alone>{text}</Alone>;
  }
  return (
    <Grid>
      {text}
      <Figure>
        <DetailImage
          src={figure.src}
          width={figure.width}
          height={figure.height}
          alt={figure.alt}
          detail={figure.detail}
          aspect={5 / 4}
        />
        <figcaption>{figure.caption}</figcaption>
      </Figure>
    </Grid>
  );
}
