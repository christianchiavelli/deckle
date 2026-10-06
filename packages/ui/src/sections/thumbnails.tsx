import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { type Detail, DetailImage } from './detail-image.tsx';

const List = styled.ul`
  display: flex;
  gap: ${t.space.gapSm};
  overflow-x: auto;
  scrollbar-width: none;
`;

const Thumb = styled.button`
  display: block;
  flex: none;
  inline-size: 4.5rem;
  block-size: 4.5rem;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: ${t.radius.control};
  background: ${t.surface.stage};
  box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.subtle};
  cursor: pointer;

  > span {
    border-radius: inherit;
  }

  &[aria-pressed='true'] {
    padding: 0.3125rem;
    box-shadow: inset 0 0 0 ${t.strokeWidth.rule} ${t.accent.default};

    > span {
      border-radius: calc(${t.radius.control} - 2px);
    }
  }
`;

export interface Thumbnail {
  /** What the thumbnail shows, which is its name: "Detail: the magic square". */
  readonly label: string;
  /** Leave out for the whole print. */
  readonly detail?: Detail;
}

export interface ThumbnailsProps {
  image: { src: string; width: number; height: number };
  items: readonly Thumbnail[];
  /** Which one the stage shows. */
  selected: number;
  onSelect?: (index: number) => void;
}

/* The whole print fits its thumbnail, on the stage's colour, as it does on the stage. */
const Whole = styled.img`
  inline-size: 100%;
  block-size: 100%;
  padding: ${t.space.gapXs};
  object-fit: contain;
`;

/** The whole print and the details worth a closer look, each cut from the same scan. */
export function Thumbnails({ image, items, selected, onSelect }: ThumbnailsProps) {
  return (
    <List>
      {items.map((item, index) => (
        <li key={item.label}>
          <Thumb
            type="button"
            aria-label={item.label}
            aria-pressed={index === selected}
            onClick={
              onSelect &&
              (() => {
                onSelect(index);
              })
            }
          >
            {item.detail ? (
              <DetailImage {...image} alt="" detail={item.detail} aspect={1} />
            ) : (
              <Whole src={image.src} alt="" loading="lazy" />
            )}
          </Thumb>
        </li>
      ))}
    </List>
  );
}
