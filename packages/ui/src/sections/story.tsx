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

  p:not(${Lede}) {
    color: ${t.text.secondary};
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

export interface StoryProps {
  id: string;
  title: string;
  lede: string;
  paragraphs: readonly string[];
  /** Where the facts come from, as the CMS requires for every story. */
  source: ReactNode;
  figure: {
    src: string;
    width: number;
    height: number;
    alt: string;
    detail: Detail;
    caption: string;
  };
}

/** The work's story from the CMS, beside the detail it talks about. */
export function Story({ id, title, lede, paragraphs, source, figure }: StoryProps) {
  return (
    <Grid>
      <Text>
        <h2 id={id}>{title}</h2>
        <Lede>{lede}</Lede>
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
        <Source>{source}</Source>
      </Text>
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
