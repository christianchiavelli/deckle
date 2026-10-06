import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band } from '../sections/band.tsx';
import { BlankProof } from '../sections/blank-proof.tsx';
import { typeRole } from '../theme/type.ts';
import { Chrome } from './chrome.tsx';

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

  p {
    max-inline-size: 44ch;
    color: ${t.text.secondary};
    font-size: 1.125rem;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapLg};
`;

/** Any address the shop has no page for: a blank proof, and the way back to the prints. */
export function NotFoundPage() {
  return (
    <Chrome>
      <Band aria-labelledby="not-found-title">
        <Grid>
          <Copy>
            <h1 id="not-found-title">This page is not here</h1>
            <p>
              The address may be mistyped, or the print may have left the shop. Every print we sell
              is on one page, and the search at the top finds any of them.
            </p>
            <Actions>
              <ButtonLink href="/prints" icon="arrow">
                Browse the prints
              </ButtonLink>
              <TextLink href="/">Go to the front page</TextLink>
            </Actions>
          </Copy>
          <BlankProof mark="404" />
        </Grid>
      </Band>
    </Chrome>
  );
}
