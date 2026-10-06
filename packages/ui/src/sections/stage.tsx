import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Chip } from '../components/chip/chip.tsx';
import { IconButton } from '../components/icon-button/icon-button.tsx';

const Figure = styled.figure`
  position: relative;
  aspect-ratio: 1;
  border-radius: ${t.radius.frame};
  background: ${t.surface.stage};

  @media ${media.md} {
    aspect-ratio: 6 / 5;
  }
`;

/* The print fits the stage whatever its proportions: the area is a size
   container, and the print takes the largest box of its own ratio inside it. */
const Area = styled.div`
  position: absolute;
  inset: ${t.space.gapXl};
  display: grid;
  place-items: center;
  container-type: size;

  @media ${media.md} {
    inset: ${t.space.gap2xl} ${t.space.gap3xl};
  }
`;

const Print = styled.div`
  position: relative;
  inline-size: min(100cqw, 100cqh * var(--ratio));

  img {
    inline-size: 100%;
    block-size: auto;
  }
`;

const corner = {
  tl: css`
    inset-inline-start: 0;
    inset-block-start: 0;
    &::before {
      inset-block-end: var(--gap);
    }
    &::after {
      inset-inline-end: var(--gap);
    }
  `,
  tr: css`
    inset-inline-end: 0;
    inset-block-start: 0;
    &::before {
      inset-block-end: var(--gap);
      inset-inline-end: 0;
    }
    &::after {
      inset-inline-start: var(--gap);
    }
  `,
  bl: css`
    inset-inline-start: 0;
    inset-block-end: 0;
    &::before {
      inset-block-start: var(--gap);
    }
    &::after {
      inset-inline-end: var(--gap);
      inset-block-end: 0;
    }
  `,
  br: css`
    inset-inline-end: 0;
    inset-block-end: 0;
    &::before {
      inset-block-start: var(--gap);
      inset-inline-end: 0;
    }
    &::after {
      inset-inline-start: var(--gap);
      inset-block-end: 0;
    }
  `,
};

/* The trim marks a printer leaves on a proof, kept faint: the one nod to the press. */
const Crop = styled.span<{ $corner: keyof typeof corner }>`
  --gap: 0.5rem;
  --length: 0.875rem;

  position: absolute;
  inline-size: 0;
  block-size: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    background: ${t.component.proof.mark};
  }

  &::before {
    inline-size: ${t.strokeWidth.hairline};
    block-size: var(--length);
  }

  &::after {
    inline-size: var(--length);
    block-size: ${t.strokeWidth.hairline};
  }

  ${({ $corner }) => corner[$corner]}
`;

const Zoom = styled(IconButton)`
  position: absolute;
  inset-block-start: ${t.space.gapMd};
  inset-inline-end: ${t.space.gapMd};
  background: ${t.surface.page};

  &:hover {
    background: ${t.surface.page};
    color: ${t.icon.accent};
  }
`;

const Caption = styled.figcaption`
  position: absolute;
  inset-block-end: ${t.space.gapMd};
  inset-inline-start: ${t.space.gapMd};

  > span {
    background: ${t.surface.page};
  }
`;

/** The four trim marks, outside the corners of the positioned box they are put in. */
export function TrimMarks() {
  return (
    <>
      <Crop $corner="tl" aria-hidden="true" />
      <Crop $corner="tr" aria-hidden="true" />
      <Crop $corner="bl" aria-hidden="true" />
      <Crop $corner="br" aria-hidden="true" />
    </>
  );
}

export interface StageImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface StageProps {
  image: StageImage;
  /** Under the print, on a chip: where the scan comes from and how large it is. */
  caption?: ReactNode;
  /** The button that opens the print up close. */
  zoom?: string;
  /** Pencil marks under the image, as on a numbered copy. */
  children?: ReactNode;
  className?: string;
}

/** The print on its stage, in its own proportions, with a proof's trim marks at the corners. */
export function Stage({ image, caption, zoom, children, className }: StageProps) {
  return (
    <Figure className={className}>
      <Area>
        <Print style={{ '--ratio': image.width / image.height }}>
          <img src={image.src} width={image.width} height={image.height} alt={image.alt} />
          <TrimMarks />
          {children}
        </Print>
      </Area>
      {zoom && <Zoom icon="zoom" label={zoom} />}
      {caption && (
        <Caption>
          <Chip>{caption}</Chip>
        </Caption>
      )}
    </Figure>
  );
}
