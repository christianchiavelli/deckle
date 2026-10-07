import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Band, SectionHead } from '../sections/band.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { Steps } from '../sections/steps.tsx';
import { typeRole } from '../theme/type.ts';
import { Chrome } from './chrome.tsx';

const Columns = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};

  @media ${media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${t.space.gap2xl} ${t.space.gap3xl};
  }

  h3 {
    ${typeRole('heading3')}
    margin-block-end: ${t.space.gapSm};
  }

  p {
    max-inline-size: 52ch;
    color: ${t.text.secondary};
  }
`;

const Closing = styled.div`
  display: grid;
  justify-items: start;
  margin-block-start: ${t.space.gap3xl};
`;

/** How a drop runs, in three steps, and the rules that keep it fair. */
export function HowDropsWorkPage() {
  return (
    <Chrome current="drops">
      <Band aria-labelledby="how-title">
        <PageHead
          id="how-title"
          title="How drops work"
          lede="A drop is fifty numbered copies of one print, released at a set hour. Whoever comes first takes the next number, and nobody takes two."
        />
      </Band>

      <Band tone="band" aria-labelledby="steps-title">
        <SectionHead id="steps-title" title="Three steps" />
        <Steps
          steps={[
            {
              title: 'Sign in with a passkey',
              text: 'Your device makes one the first time, with your face, your finger or its PIN. There is no password, and one passkey is one person.',
            },
            {
              title: 'Claim a copy',
              text: 'The next open number is yours, held for ten minutes. Everyone sees it go, on the drop’s page, as it happens.',
            },
            {
              title: 'Pay before the time runs out',
              text: 'Paid, it is printed, numbered in pencil and rolled in a tube. Not paid, it goes back to the edition for the next person.',
            },
          ]}
        />
      </Band>

      <Band aria-labelledby="rules-title">
        <SectionHead id="rules-title" title="The rules behind it" />
        <Columns>
          <div>
            <h3>Never fifty-one</h3>
            <p>
              The numbers live in a database that hands each one out once, in a single step, even to
              a thousand people in the same second. The shop’s stock counts them a second time.
            </p>
          </div>
          <div>
            <h3>One per person</h3>
            <p>
              A passkey stands for one person, and the database refuses a second copy to the same
              one, held or paid.
            </p>
          </div>
          <div>
            <h3>Ten minutes, and no longer</h3>
            <p>
              The clock on a held copy is the database’s, not your browser’s. When it runs out the
              copy is open again, whether or not anyone is looking.
            </p>
          </div>
          <div>
            <h3>A test payment</h3>
            <p>
              Deckle is a portfolio project: the order is real and lands in the shop’s dashboard,
              and the payment settles at once with no money moving.
            </p>
          </div>
        </Columns>
        <Closing>
          <ButtonLink href="/drops" variant="accent" icon="arrow">
            See the drops
          </ButtonLink>
        </Closing>
      </Band>
    </Chrome>
  );
}
