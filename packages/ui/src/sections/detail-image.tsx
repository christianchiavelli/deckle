import styled from 'styled-components';
import { type Detail, placement } from './detail.ts';

export type { Detail } from './detail.ts';

const Frame = styled.span`
  position: relative;
  display: block;
  overflow: hidden;
  inline-size: 100%;

  img {
    position: absolute;
    max-inline-size: none;
  }
`;

export interface DetailImageProps {
  src: string;
  /** The image's own size, for its proportions. */
  width: number;
  height: number;
  alt: string;
  detail: Detail;
  /** The frame's width over its height: 1 for a thumbnail, 5 / 4 beside a story. */
  aspect: number;
  className?: string;
}

/**
 * A close look at part of a print, cut from the one scan: the curator names a
 * point and a zoom, and no second image is made or stored.
 */
export function DetailImage({
  src,
  width,
  height,
  alt,
  detail,
  aspect,
  className,
}: DetailImageProps) {
  const place = placement({ width, height }, aspect, detail);
  return (
    <Frame className={className} style={{ aspectRatio: aspect }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          inlineSize: `${place.width}%`,
          blockSize: `${place.height}%`,
          insetInlineStart: `${place.left}%`,
          insetBlockStart: `${place.top}%`,
        }}
      />
    </Frame>
  );
}
