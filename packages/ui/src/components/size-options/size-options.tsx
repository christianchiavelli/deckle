import { tokens as t } from '@deckle/tokens';
import { type ReactNode, useId } from 'react';
import styled from 'styled-components';
import { formatCentimetres, formatMoney, formatPpi, type Centimetres } from '../../format.ts';
import { Chip } from '../chip/chip.tsx';
import { Icon } from '../icon/icon.tsx';
import { Missing } from '../missing/missing.tsx';
import { visuallyHidden } from '../visually-hidden/visually-hidden.tsx';

/**
 * One paper size, as `@deckle/print-sizes` works it out for a scan, with the
 * price commerce sells it at.
 */
export interface SizeOption {
  /** The paper size, which is also the value the form sends: `A4`, `A3`… */
  readonly size: string;
  readonly paper: Centimetres;
  readonly ppi: number;
  /** False when the scan is too small for this size: it is shown, but cannot be chosen. */
  readonly available: boolean;
  /** In minor units. `null` when commerce has no price for it. */
  readonly price: number | null;
}

/* A grid fieldset, so the legend and the link beside it share a row. A legend
   is laid out as a grid item only when it floats; it still names the group. */
const Group = styled.fieldset`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: ${t.space.gapSm};
  font-size: 0.875rem;
`;

const Legend = styled.legend`
  float: inline-start;
  font-weight: ${t.type.label.weight};
`;

const Help = styled.span`
  justify-self: end;
`;

const Tiles = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${t.space.gapSm};
`;

const Full = styled.div`
  grid-column: 1 / -1;
`;

/* Two rows that share nothing but the tile's edges: a long "Scan too small"
   never squeezes the sheet's size, and on a narrow tile the chip drops below. */
const Row = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.125rem ${t.space.gapSm};
`;

const Name = styled.span`
  font-size: 1rem;
  font-weight: ${t.type.label.weight};
`;

const Amount = styled.span`
  font-size: 0.9375rem;
  font-weight: ${t.type.label.weight};
  font-variant-numeric: tabular-nums;
`;

const Measure = styled.span`
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  white-space: nowrap;
`;

/** Styled only to be named: a chosen tile turns its chip to the page colour. */
const Ppi = styled(Chip)``;

/*
 * The sizes are doubled to outrank the icon's own: in a page rendered on the
 * server, the icon's styles can arrive after these. Hidden stays single, so
 * the checked option's rule shows it.
 */
const Check = styled(Icon)`
  && {
    position: absolute;
    inset-block-start: -0.4375rem;
    inset-inline-end: -0.4375rem;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    padding: 0.1875rem;
    border-radius: 50%;
    background: ${t.accent.default};
    color: ${t.text.onAccent};
    stroke-width: 2.4;
  }

  visibility: hidden;
`;

const Radio = styled.input`
  ${visuallyHidden}
`;

const Tile = styled.label`
  position: relative;
  display: grid;
  gap: 0.125rem;
  padding: 0.875rem ${t.space.gapMd};
  border-radius: ${t.radius.control};
  box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.default};
  cursor: pointer;
  transition:
    box-shadow ${t.motion.feedback} ${t.motion.easing},
    background-color ${t.motion.feedback} ${t.motion.easing};

  &:hover {
    box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.strong};
  }

  &:has(${Radio}:checked) {
    background: ${t.accent.subtle};
    box-shadow: inset 0 0 0 ${t.strokeWidth.rule} ${t.accent.default};

    ${Ppi} {
      background: ${t.surface.page};
      color: ${t.text.accent};
    }

    ${Check} {
      visibility: visible;
    }
  }

  &:has(${Radio}:focus-visible) {
    outline: ${t.strokeWidth.rule} solid ${t.focus.ring};
    outline-offset: 2px;
  }

  /* Out of reach for this scan: drawn in dashes, and the radio is disabled, so
     a screen reader still hears the size and why it cannot be chosen. */
  &:has(${Radio}:disabled) {
    cursor: not-allowed;
    box-shadow: none;
    outline: ${t.strokeWidth.hairline} dashed ${t.stroke.default};
    outline-offset: calc(${t.strokeWidth.hairline} * -1);

    ${Name}, ${Measure} {
      color: ${t.text.muted};
    }

    ${Amount} {
      color: ${t.text.muted};
      font-size: 0.8125rem;
      font-weight: 500;
    }
  }
`;

export interface SizeOptionsProps {
  /** The radio group's name, unique on the page: the form sends the chosen size under it. */
  name: string;
  legend: string;
  options: readonly SizeOption[];
  /** The chosen size, when the parent keeps it. */
  value?: string;
  /** The size chosen at first, when the form keeps it: then it works before any script runs. */
  defaultValue?: string;
  onValueChange?: (size: string) => void;
  currency: string;
  locale: string;
  /** What an unavailable size says in place of its price: "Scan too small". */
  unavailable: string;
  /** What a missing price means, read aloud in place of the dash. */
  missingPrice: string;
  /** Beside the legend: a link to how sizes are worked out. */
  help?: ReactNode;
  /** Under the sizes: why the largest ones cannot be printed. Read as the group's description. */
  note?: ReactNode;
}

/**
 * The paper sizes of one work, as radio tiles. A size the scan cannot reach at
 * the minimum resolution is shown, not hidden, with what it would need.
 */
export function SizeOptions({
  name,
  legend,
  options,
  value,
  defaultValue,
  onValueChange,
  currency,
  locale,
  unavailable,
  missingPrice,
  help,
  note,
}: SizeOptionsProps) {
  const noteId = useId();
  return (
    <Group aria-describedby={note ? noteId : undefined}>
      <Legend>{legend}</Legend>
      {help && <Help>{help}</Help>}
      <Tiles>
        {options.map((option) => (
          <Tile key={option.size}>
            <Radio
              type="radio"
              name={name}
              value={option.size}
              disabled={!option.available}
              {...(value === undefined
                ? { defaultChecked: option.size === defaultValue }
                : { checked: option.size === value })}
              // Only with a listener: a server-rendered form keeps no function on its inputs.
              onChange={
                onValueChange &&
                ((event) => {
                  onValueChange(event.currentTarget.value);
                })
              }
            />
            <Row>
              <Name>{option.size}</Name>
              <Amount>
                {!option.available ? (
                  unavailable
                ) : option.price === null ? (
                  <Missing label={missingPrice} />
                ) : (
                  formatMoney(option.price, currency, locale)
                )}
              </Amount>
            </Row>
            <Row>
              <Measure>{formatCentimetres(option.paper, locale)}</Measure>
              <Ppi>{formatPpi(option.ppi, locale)}</Ppi>
            </Row>
            <Check name="check" size="tiny" />
          </Tile>
        ))}
      </Tiles>
      {note && <Full id={noteId}>{note}</Full>}
    </Group>
  );
}
