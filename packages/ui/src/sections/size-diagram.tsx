import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { type Centimetres, formatPpi } from '../format.ts';

export interface DiagramSize {
  readonly size: string;
  readonly paper: Centimetres;
  /** The printed image inside the sheet's border, centred. */
  readonly image: Centimetres;
  readonly ppi: number;
  readonly available: boolean;
}

/* The sheets stand side by side on one baseline, each as wide as its paper:
   flex-grow by width from a zero basis keeps them to scale at any width. */
const Lineup = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${t.space.gapSm};
`;

const Item = styled.div`
  display: grid;
  gap: ${t.space.gapXs};
  flex-basis: 0;
  min-inline-size: 0;
`;

const Sheet = styled.div<{ $available: boolean }>`
  display: grid;
  place-items: center;
  border-radius: 2px;
  background: ${({ $available }) => ($available ? t.surface.page : 'transparent')};
  outline: ${t.strokeWidth.hairline} ${({ $available }) => ($available ? 'solid' : 'dashed')}
    ${({ $available }) => ($available ? t.stroke.accent : t.stroke.default)};
  outline-offset: calc(${t.strokeWidth.hairline} * -1);

  img {
    block-size: auto;
  }
`;

const Label = styled.p<{ $available: boolean }>`
  display: grid;
  color: ${({ $available }) => ($available ? t.text.primary : t.text.secondary)};
  font-size: 0.75rem;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;

  /* The size never breaks; its ppi wraps under itself where a small sheet is
     narrower than "248 ppi", as A4 is beside A1 on a phone. */
  strong {
    white-space: nowrap;
    color: ${({ $available }) => ($available ? t.text.accent : 'inherit')};
    font-size: 0.875rem;
    font-weight: ${t.type.label.weight};
  }
`;

export interface SizeDiagramProps {
  /** Every size, smallest first, as `@deckle/print-sizes` lists them. */
  sizes: readonly DiagramSize[];
  /** The print, drawn to scale on every sheet the scan can fill. */
  src: string;
  locale: string;
}

/**
 * The paper sizes side by side, to scale. The ones the scan can print hold
 * the print as it would be printed; the rest are dashed outlines. It repeats
 * what the text beside it says, so it is hidden from screen readers.
 */
export function SizeDiagram({ sizes, src, locale }: SizeDiagramProps) {
  return (
    <Lineup aria-hidden="true">
      {sizes.map((size) => (
        <Item key={size.size} style={{ flexGrow: size.paper.width }}>
          <Sheet
            $available={size.available}
            style={{ aspectRatio: `${size.paper.width} / ${size.paper.height}` }}
          >
            {size.available && (
              <img
                src={src}
                alt=""
                loading="lazy"
                style={{ inlineSize: `${(size.image.width / size.paper.width) * 100}%` }}
              />
            )}
          </Sheet>
          <Label $available={size.available}>
            <strong>{size.size}</strong>
            <span>{formatPpi(size.ppi, locale)}</span>
          </Label>
        </Item>
      ))}
    </Lineup>
  );
}
