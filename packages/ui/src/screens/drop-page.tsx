import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Button, ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band, SectionHead } from '../sections/band.tsx';
import {
  Copies,
  CopiesKey,
  type CopyState,
  Countdown,
  EditionFacts,
  Tally,
} from '../sections/edition.tsx';
import { Record } from '../sections/record.tsx';
import { Stage } from '../sections/stage.tsx';
import { Steps } from '../sections/steps.tsx';
import { typeRole } from '../theme/type.ts';
import { type PasskeyStep, PasskeyDialog } from '../sections/passkey-dialog.tsx';
import { Chrome } from './chrome.tsx';
import { copyWords } from './edition-band.tsx';
import { imageOf, pixels, scanOf, work } from './fixtures.ts';

/** Before it opens, while copies are open, and once one is held for this reader. */
export type DropState = 'soon' | 'open' | 'held';

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

  h1 {
    ${typeRole('heading1')}
    text-wrap: balance;

    @media ${media.md} {
      ${typeRole('display')}
    }
  }

  > p {
    max-inline-size: 52ch;
  }
`;

const Actions = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapLg};
`;

const Small = styled.p`
  font-size: 0.8125rem;
  opacity: 0.85;
`;

/* The edition number, written in pencil under the print as on a numbered copy. */
const Pencil = styled.span`
  position: absolute;
  inset-block-start: calc(100% + 0.5rem);
  inset-inline-start: 0;
  color: ${t.text.secondary};
  font-size: 0.875rem;
  font-style: italic;
  font-weight: 300;
  letter-spacing: 0.04em;
`;

const Blank = styled.span`
  display: inline-block;
  inline-size: 1.75em;
  border-block-end: ${t.strokeWidth.hairline} solid currentColor;
`;

const Live = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${t.space.gapXs};
  color: ${t.text.secondary};
  font-size: 0.875rem;

  &::before {
    content: '';
    inline-size: 0.5rem;
    block-size: 0.5rem;
    border-radius: 50%;
    background: ${t.feedback.success};
  }
`;

const CopiesLayout = styled.div`
  display: grid;
  gap: ${t.space.gapXl};

  @media ${media.md} {
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: ${t.space.gap3xl};
    align-items: start;
  }
`;

const CopiesText = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapMd};

  h2 {
    ${typeRole('heading2')}
  }

  p {
    color: ${t.text.secondary};
  }
`;

/* Seventeen claimed and two held, as a drop looks some minutes after it opens. */
const taken: Record<number, Exclude<CopyState, 'open'>> = { 17: 'held', 18: 'held' };
for (const copy of [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 21]) {
  taken[copy] = 'claimed';
}

/** A drop's page: the numbered edition of Melencolia I, before it opens, open, or held for you. */
export interface DropPageProps {
  state: DropState;
  /** "Claim a copy" pressed while signed out: the way in, at one of its steps. */
  signIn?: PasskeyStep;
}

export function DropPage({ state, signIn }: DropPageProps) {
  const melencolia = work('melencolia-i');
  const image = imageOf(melencolia);
  const scan = scanOf(melencolia);
  const states: Record<number, Exclude<CopyState, 'open'>> = state === 'soon'
    ? {}
    : state === 'held'
      ? { ...taken, 7: 'yours' }
      : { ...taken, 7: 'claimed' };
  const counts = Object.values(states);
  const claimed = counts.filter((value) => value === 'claimed' || value === 'yours').length;
  const held = counts.filter((value) => value === 'held').length;
  const open = 50 - claimed - held;

  return (
    <Chrome current="drops" announcement={false}>
      {signIn && (
        <PasskeyDialog
          id="passkey-title"
          open
          step={signIn}
          title="Claim with a passkey"
          text="A copy is one per person, so a drop asks who you are: with a passkey your device keeps, made once here or used again."
          use="Use my passkey"
          make="Make a passkey"
          waiting="Waiting for your device…"
          failed="Your device did not answer. Try again, or make a passkey if this device has none for Deckle."
          small="Deckle keeps only the passkey’s public half. Your face, finger or PIN stay on your device."
          close="Close"
        />
      )}
      <Band tone="feature" aria-labelledby="drop-title">
        <Grid>
          <Copy>
            {state === 'soon' && <Chip tone="accent">Opens in 3 days</Chip>}
            {state === 'open' && <Chip tone="accent">Open now</Chip>}
            {state === 'held' && <Chip tone="accent">Held for you</Chip>}
            <h1 id="drop-title">
              {state === 'held'
                ? 'Copy 7 of 50 is yours for ten minutes'
                : 'Melencolia I, in fifty numbered copies'}
            </h1>
            {state === 'held' ? (
              <p>
                Pay before the time runs out and it is printed, numbered 7/50 in pencil and shipped
                rolled in a tube. If you don’t, it goes back to the edition for the next person.
              </p>
            ) : (
              <p>
                Each copy is A3, printed from The Met’s scan at 302 ppi and numbered in pencil, from
                1/50 to 50/50. Claim one and it is held for you for ten minutes while you pay.
              </p>
            )}

            {state === 'soon' && (
              <Countdown
                label="Opens in 3 days, 4 hours and 12 minutes"
                units={[
                  { value: '03', unit: 'days' },
                  { value: '04', unit: 'hours' },
                  { value: '12', unit: 'minutes' },
                ]}
              />
            )}
            {state === 'open' && (
              <Tally
                items={[
                  { value: String(open), unit: 'open' },
                  { value: String(held), unit: 'held' },
                  { value: String(claimed), unit: 'claimed' },
                ]}
              />
            )}
            {state === 'held' && (
              <Countdown
                label="9 minutes and 42 seconds left to pay"
                units={[
                  { value: '09', unit: 'minutes' },
                  { value: '42', unit: 'seconds' },
                ]}
              />
            )}

            {state === 'soon' && (
              <EditionFacts
                items={[
                  { term: 'Opens', detail: 'Thu 15 Oct, 18:00 UTC' },
                  { term: 'Price', detail: '$180' },
                  { term: 'Limit', detail: 'One per person' },
                ]}
              />
            )}

            <Actions action="/drops/melencolia-i/claim" method="post">
              {state === 'soon' && (
                <ButtonLink href="/sign-in" variant="accent" icon="key">
                  Get ready with a passkey
                </ButtonLink>
              )}
              {state === 'open' && (
                <Button type="submit" variant="accent" icon="key">
                  Claim a copy
                </Button>
              )}
              {state === 'held' && (
                <ButtonLink href="/checkout" variant="accent" icon="bag">
                  Pay $180
                </ButtonLink>
              )}
              {state === 'held' ? (
                <TextLink href="/drops/melencolia-i/release" tone="onFeature">
                  Let it go
                </TextLink>
              ) : (
                <TextLink href="/about/drops" tone="onFeature" icon="arrow">
                  How drops work
                </TextLink>
              )}
            </Actions>
            {state !== 'held' && (
              <Small>
                You sign in with a passkey first: no password to remember, and one copy per person.
              </Small>
            )}
          </Copy>
          <Stage
            image={{
              ...image,
              alt: 'Melencolia I: a winged woman brooding among tools of geometry and carpentry.',
            }}
          >
            <Pencil aria-hidden="true">{state === 'held' ? '7' : <Blank />}/50</Pencil>
          </Stage>
        </Grid>
      </Band>

      <Band aria-labelledby="copies-title">
        <CopiesLayout>
          <CopiesText>
            <h2 id="copies-title">The fifty copies</h2>
            {state !== 'soon' && <Live>Updates as they are claimed</Live>}
            <p>
              Each square is one copy. The next open number goes to whoever claims next, and a held
              copy comes back if its ten minutes run out.
            </p>
            <CopiesKey
              words={copyWords}
              shown={
                state === 'held'
                  ? ['open', 'held', 'claimed', 'yours']
                  : ['open', 'held', 'claimed']
              }
            />
          </CopiesText>
          <Copies
            total={50}
            states={states}
            words={copyWords}
            label={`Copies 1 to 50, ${open} open`}
            caption={
              state === 'soon'
                ? '50 copies · none claimed yet'
                : `50 copies · ${claimed} claimed · ${held} held · ${open} open`
            }
          />
        </CopiesLayout>
      </Band>

      <Band tone="band" aria-labelledby="how-title">
        <SectionHead id="how-title" title="How a drop works" />
        <Steps
          steps={[
            {
              title: 'Sign in with a passkey',
              text: 'Your fingerprint, face or device PIN, never a password. A passkey belongs to one person, which is how one copy each holds.',
            },
            {
              title: 'Claim a copy',
              text: 'The next open number is held for you for ten minutes. If you don’t pay in time, it goes back to the edition.',
            },
            {
              title: 'We print and number it',
              text: 'Pigment on cotton rag, numbered in pencil, and shipped rolled in a tube.',
            },
          ]}
        />
      </Band>

      <Band aria-labelledby="print-title">
        <SectionHead id="print-title" title="The print" />
        <Record
          missing="Not set"
          entries={[
            { term: 'Size', detail: 'A3, 29.7 × 42 cm' },
            {
              term: 'Resolution',
              detail: `302 ppi, from The Met’s scan of ${pixels(scan.width)} × ${pixels(scan.height)} px`,
            },
            { term: 'Paper', detail: 'Cotton rag, pigment inks' },
            { term: 'Edition', detail: '50 copies, numbered 1/50 to 50/50' },
            { term: 'Price', detail: '$180' },
            { term: 'Limit', detail: 'One per person' },
          ]}
        />
      </Band>
    </Chrome>
  );
}
