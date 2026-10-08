import {
  Band,
  ButtonLink,
  Chip,
  Copies,
  EditionFacts,
  Tally,
  TextLink,
  typeRole,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { copy } from '../copy';
import {
  chipOf,
  type DropSummary,
  factsOf,
  headlineOf,
  marksOf,
  paragraphsOf,
  phaseOf,
  soonChipOf,
  type Stock,
  standingOf,
  tallyOf,
} from '../views/drops';
import { OpeningCountdown } from './opening-countdown';

const Grid = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  align-items: center;

  @media ${media.md} {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    gap: ${t.space.gap3xl};
  }
`;

const Words = styled.div`
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

export interface EditionBandProps {
  readonly drop: DropSummary;
  /** Where its copies stand, a second old at most; null when the gateway could not say. */
  readonly stock: Stock | null;
  /** When the page was drawn, for what is soon and what is open. */
  readonly now: number;
}

/**
 * A drop on the copper dark, as approved for the front page and a work's own
 * page: when it opens or how it stands, and the way to it.
 */
export function EditionBand({ drop, stock, now }: EditionBandProps) {
  const soon = phaseOf(drop, now) === 'soon';
  const chip = soon
    ? { label: soonChipOf(drop, now, copy), tone: 'accent' as const }
    : chipOf(drop, stock, now, copy);
  const [paragraph] = paragraphsOf(drop);
  const facts = factsOf(drop, stock, now, copy);
  const standing = stock && standingOf(stock, drop.editionSize, copy);

  return (
    <Band tone="feature" id="edition" aria-labelledby="edition-title">
      <Grid>
        <Words>
          <Chip tone={chip.tone}>{chip.label}</Chip>
          <h2 id="edition-title">{headlineOf(drop, copy)}</h2>
          {paragraph && <p>{paragraph}</p>}
          {soon ? (
            <OpeningCountdown opensAt={drop.opensAt} now={now} />
          ) : (
            stock && <Tally items={tallyOf(stock, copy)} />
          )}
          {/* Once open, the tally already counts what is open. */}
          <EditionFacts items={soon ? facts : facts.slice(1)} />
          <Actions>
            <ButtonLink href={`/drops/${drop.slug}`} variant="accent" icon="key">
              {soon ? copy.drops.join : copy.drops.claim}
            </ButtonLink>
            <TextLink href="/about/drops" tone="onFeature" icon="arrow">
              {copy.drops.howTheyWork}
            </TextLink>
          </Actions>
        </Words>
        {stock && standing && (
          <Copies
            total={drop.editionSize}
            states={marksOf(stock, null)}
            words={copy.drops.copyWords}
            label={standing.label}
            caption={standing.caption}
          />
        )}
      </Grid>
    </Band>
  );
}
