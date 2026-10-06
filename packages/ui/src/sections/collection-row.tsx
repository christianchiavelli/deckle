import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { TextLink } from '../components/text-link/text-link.tsx';
import { typeRole } from '../theme/type.ts';
import { Band } from './band.tsx';

const Row = styled.div`
  display: grid;
  gap: ${t.space.gapXl};

  @media ${media.md} {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: ${t.space.gap3xl};
    align-items: center;
  }
`;

const Copy = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapMd};

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;
  }

  p {
    max-inline-size: 44ch;
    color: ${t.text.secondary};
  }
`;

/* Four prints side by side, as on a contact sheet: on a band the cells take
   the page's paper, so they stand out from it as they do from the page. */
const Strip = styled.a<{ $onBand: boolean }>`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${t.space.gapXs};

  @media ${media.md} {
    gap: ${t.space.gapSm};
  }

  span {
    position: relative;
    aspect-ratio: 4 / 5;
    border-radius: ${t.radius.frame};
    background: ${({ $onBand }) => ($onBand ? t.surface.page : t.surface.stage)};
  }

  img {
    position: absolute;
    inset: 12%;
    inline-size: 76%;
    block-size: 76%;
    object-fit: contain;
  }
`;

export interface CollectionRowProps {
  /** The heading's id, for the band's name. */
  id: string;
  tone: 'page' | 'band';
  title: string;
  intro: string | null;
  href: string;
  /** "See the 4 prints". */
  link: string;
  /** The first four are shown. */
  images: readonly { src: string; width: number; height: number }[];
}

/**
 * One collection as a band of its own: its name, why its prints belong
 * together, and the first four of them. The strip repeats the link for the
 * pointer, so it is hidden from the keyboard and screen readers.
 */
export function CollectionRow({ id, tone, title, intro, href, link, images }: CollectionRowProps) {
  return (
    <Band tone={tone} aria-labelledby={id}>
      <Row>
        <Copy>
          <h2 id={id}>{title}</h2>
          {intro && <p>{intro}</p>}
          <TextLink href={href} icon="arrow">
            {link}
          </TextLink>
        </Copy>
        <Strip href={href} tabIndex={-1} aria-hidden="true" $onBand={tone === 'band'}>
          {images.slice(0, 4).map((image) => (
            <span key={image.src}>
              <img
                src={image.src}
                width={image.width}
                height={image.height}
                alt=""
                loading="lazy"
              />
            </span>
          ))}
        </Strip>
      </Row>
    </Band>
  );
}
