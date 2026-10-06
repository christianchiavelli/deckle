import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band } from '../sections/band.tsx';
import { Copies, Countdown, EditionFacts } from '../sections/edition.tsx';
import { typeRole } from '../theme/type.ts';

const Grid = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  align-items: center;

  @media ${media.md} {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: ${t.space.gap3xl};
  }
`;

const Copy = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;

    @media ${media.md} {
      ${typeRole('heading1')}
    }
  }

  > p {
    max-inline-size: 52ch;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapLg};
`;

export const copyWords = {
  open: 'open',
  held: 'held while someone pays',
  claimed: 'claimed',
  yours: 'yours',
} as const;

/** The numbered edition of the work on this page, in the drop's copper dark. */
export function EditionBand() {
  return (
    <Band tone="feature" id="edition" aria-labelledby="edition-title">
      <Grid>
        <Copy>
          <Chip tone="accent">Opens in 3 days</Chip>
          <h2 id="edition-title">Melencolia I, in fifty numbered copies</h2>
          <p>
            Each copy is A3 and numbered in pencil, from 1/50 to 50/50. Claim one and it is held for
            you for ten minutes while you pay; if you don’t, it goes back for the next person.
          </p>
          <Countdown
            label="Opens in 3 days, 4 hours and 12 minutes"
            units={[
              { value: '03', unit: 'days' },
              { value: '04', unit: 'hours' },
              { value: '12', unit: 'minutes' },
            ]}
          />
          <EditionFacts
            items={[
              { term: 'Opens', detail: 'Thu 15 Oct, 18:00 UTC' },
              { term: 'Price', detail: '$180' },
              { term: 'Limit', detail: 'One per person' },
            ]}
          />
          <Actions>
            <ButtonLink href="/drops/melencolia-i" variant="accent" icon="key">
              Join with a passkey
            </ButtonLink>
            <TextLink href="/about/drops" tone="onFeature" icon="arrow">
              How drops work
            </TextLink>
          </Actions>
        </Copy>
        <Copies
          total={50}
          states={{}}
          words={copyWords}
          label="Copies 1 to 50, none claimed yet"
          caption="50 copies · none claimed yet"
        />
      </Grid>
    </Band>
  );
}
