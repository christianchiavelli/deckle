import { Band, BlankProof, ButtonLink, TextLink, typeRole } from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Chrome } from '../../components/chrome';
import { getCopy } from '../../copy/server';

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

/**
 * Any address the store has no page for, a work it does not sell among them: a
 * blank proof. It renders under the root layout alone, even for a slug a section
 * turned away, so it brings its own chrome, in no section.
 */
export default async function NotFound() {
  const copy = await getCopy();
  const { notFound: text } = copy;
  return (
    <Chrome>
      <Band aria-labelledby="not-found-title">
        <Grid>
          <Copy>
            <h1 id="not-found-title">{text.title}</h1>
            <p>{text.text}</p>
            <Actions>
              <ButtonLink href={copy.path('/prints')} icon="arrow">
                {text.browse}
              </ButtonLink>
              <TextLink href={copy.path('/')}>{text.home}</TextLink>
            </Actions>
          </Copy>
          <BlankProof mark={text.mark} />
        </Grid>
      </Band>
    </Chrome>
  );
}
