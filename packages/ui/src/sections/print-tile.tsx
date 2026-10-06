import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';

const Card = styled.a`
  display: grid;
  gap: 0.125rem;
  text-decoration: none;
`;

const Frame = styled.span`
  position: relative;
  aspect-ratio: 4 / 5;
  margin-block-end: ${t.space.gapSm};
  overflow: hidden;
  border-radius: ${t.radius.frame};
  background: ${t.surface.stage};

  img {
    position: absolute;
    inset: ${t.space.gapLg};
    inline-size: calc(100% - 2 * ${t.space.gapLg});
    block-size: calc(100% - 2 * ${t.space.gapLg});
    object-fit: contain;
    transition: scale ${t.motion.enter} ${t.motion.easing};

    @media ${media.md} {
      inset: ${t.space.gapXl};
      inline-size: calc(100% - 2 * ${t.space.gapXl});
      block-size: calc(100% - 2 * ${t.space.gapXl});
    }
  }

  ${Card}:hover & img {
    scale: 1.03;
  }
`;

const Title = styled.span`
  font-weight: ${t.type.label.weight};
  text-wrap: balance;
`;

const Meta = styled.span`
  color: ${t.text.secondary};
  font-size: 0.875rem;
`;

const Price = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapXs};
  margin-block-start: ${t.space.gap2xs};
  font-size: 0.9375rem;
  font-weight: ${t.type.label.weight};
`;

export interface PrintTileProps {
  href: string;
  image: { src: string; width: number; height: number };
  title: string;
  /** Who and when: "Albrecht Dürer, 1514". Or, for a collection, how many prints. */
  meta: string;
  /** "From $55", with a chip when only some sizes are on offer. */
  price?: ReactNode;
}

/**
 * A print in a grid, on its own small stage. The image is decorative: the
 * title beside it names the link.
 */
export function PrintTile({ href, image, title, meta, price }: PrintTileProps) {
  return (
    <Card href={href}>
      <Frame>
        <img src={image.src} width={image.width} height={image.height} alt="" loading="lazy" />
      </Frame>
      <Title>{title}</Title>
      <Meta>{meta}</Meta>
      {price && <Price>{price}</Price>}
    </Card>
  );
}

/** Prints two across on a phone and four on a laptop. */
export const PrintGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${t.space.gapXl} ${t.space.gapMd};

  @media ${media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: ${t.space.gapLg};
  }
`;
