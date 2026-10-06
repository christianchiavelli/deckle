import { tokens as t } from '@deckle/tokens';
import styled, { css } from 'styled-components';
import { VisuallyHidden } from '../components/visually-hidden/visually-hidden.tsx';

/* The edition's pieces sit on whatever band they are on, light paper or the
   drop's copper dark, so their rules and tints are mixed from the text colour. */
const tint = (percent: number) => `color-mix(in srgb, currentColor ${percent}%, transparent)`;

const Units = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${t.space.gapSm};
`;

const Unit = styled.div`
  display: grid;
  justify-items: center;
  min-inline-size: 5.5rem;
  padding: ${t.space.gapSm} ${t.space.gapMd};
  border-radius: ${t.radius.control};
  box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${tint(22)};
  font-size: 0.8125rem;

  span:last-child {
    opacity: 0.78;
  }
`;

const Figure = styled.span`
  font-family: ${t.type.numeral.family};
  font-size: ${t.type.numeral.size};
  font-weight: ${t.type.numeral.weight};
  line-height: 1.05;
  letter-spacing: ${t.type.numeral.tracking};
  font-variant-numeric: tabular-nums;
`;

export interface CountdownProps {
  /** The whole time left as a sentence, which is what a screen reader hears. */
  label: string;
  units: readonly { readonly value: string; readonly unit: string }[];
}

/** Days, hours and minutes to a drop, in the edition's figures. */
export function Countdown({ label, units }: CountdownProps) {
  return (
    <Units role="timer" aria-label={label}>
      {units.map((unit) => (
        <Unit key={unit.unit} aria-hidden="true">
          <Figure>{unit.value}</Figure>
          <span>{unit.unit}</span>
        </Unit>
      ))}
    </Units>
  );
}

export interface TallyProps {
  items: readonly { readonly value: string; readonly unit: string }[];
}

/** The edition as it stands, read out when it changes: how many are open, held and claimed. */
export function Tally({ items }: TallyProps) {
  return (
    <Units role="status">
      {items.map((item) => (
        <Unit key={item.unit}>
          <Figure>{item.value}</Figure>
          <span>{item.unit}</span>
        </Unit>
      ))}
    </Units>
  );
}

const List = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: ${t.space.gapSm} ${t.space.gap2xl};

  dt {
    font-size: 0.8125rem;
    opacity: 0.78;
  }

  dd {
    font-weight: ${t.type.label.weight};
    font-variant-numeric: tabular-nums;
  }
`;

export interface EditionFactsProps {
  items: readonly { readonly term: string; readonly detail: string }[];
}

/** When it opens, what it costs, how many each person may have. */
export function EditionFacts({ items }: EditionFactsProps) {
  return (
    <List>
      {items.map((item) => (
        <div key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.detail}</dd>
        </div>
      ))}
    </List>
  );
}

/** Where one numbered copy stands. */
export type CopyState = 'open' | 'held' | 'claimed' | 'yours';

/* Told apart by fill and line, never by fading the number: a claimed copy's
   number is still information, and keeps its contrast. */
const states = {
  open: css`
    box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${tint(30)};
  `,
  /* Someone is paying for it: dashed, because it may yet come back. */
  held: css`
    outline: ${t.strokeWidth.hairline} dashed ${tint(70)};
    outline-offset: calc(${t.strokeWidth.hairline} * -1);
  `,
  claimed: css`
    background: ${tint(18)};
  `,
  yours: css`
    background: ${t.accent.default};
    color: ${t.text.onAccent};
    font-weight: ${t.type.label.weight};
  `,
};

const Grid = styled.ol`
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: ${t.space.gapXs};
`;

const Copy = styled.li<{ $state: CopyState }>`
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  ${({ $state }) => states[$state]}
`;

const Caption = styled.figcaption`
  font-size: 0.8125rem;
  opacity: 0.78;
`;

const Wrapper = styled.figure`
  display: grid;
  gap: ${t.space.gapSm};
`;

const Key = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${t.space.gapXs} ${t.space.gapLg};
  font-size: 0.8125rem;

  li {
    display: flex;
    align-items: center;
    gap: ${t.space.gapXs};
  }
`;

const Swatch = styled.span<{ $state: CopyState }>`
  inline-size: 1rem;
  block-size: 1rem;
  border-radius: 0.25rem;
  ${({ $state }) => states[$state]}
`;

export interface CopiesKeyProps {
  words: Readonly<Record<CopyState, string>>;
  /** The states this edition shows, in the order a reader meets them. */
  shown: readonly CopyState[];
}

/** What each square in the grid means. */
export function CopiesKey({ words, shown }: CopiesKeyProps) {
  return (
    <Key>
      {shown.map((state) => (
        <li key={state}>
          <Swatch $state={state} aria-hidden="true" />
          {words[state]}
        </li>
      ))}
    </Key>
  );
}

export interface CopiesProps {
  /** How many copies the edition has: 50. */
  total: number;
  /** Copies that are not open, by number. Every other one is. */
  states: Readonly<Record<number, Exclude<CopyState, 'open'>>>;
  /** Each state in words, read after the copy's number. */
  words: Readonly<Record<CopyState, string>>;
  /** The list's name, with the count: "Copies 1 to 50, 31 still open". */
  label: string;
  caption: string;
}

/** Every copy of a numbered edition, as it stands: open, held while someone pays, claimed, yours. */
export function Copies({ total, states: taken, words, label, caption }: CopiesProps) {
  return (
    <Wrapper>
      <Grid aria-label={label}>
        {Array.from({ length: total }, (_, index) => {
          const number = index + 1;
          const state = taken[number] ?? 'open';
          return (
            <Copy key={number} $state={state}>
              <span aria-hidden="true">{number}</span>
              <VisuallyHidden>
                {number}, {words[state]}
              </VisuallyHidden>
            </Copy>
          );
        })}
      </Grid>
      <Caption>{caption}</Caption>
    </Wrapper>
  );
}
