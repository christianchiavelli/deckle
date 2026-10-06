import { Band, ButtonLink, typeRole } from '@deckle/ui';
import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { copy } from '../copy';

const Message = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  min-block-size: 40vh;
  align-content: center;

  h1 {
    ${typeRole('heading1')}
  }

  p {
    max-inline-size: 46ch;
    color: ${t.text.secondary};
  }
`;

/** Any address the store has no page for, a work it does not sell among them. */
export default function NotFound() {
  return (
    <Band aria-labelledby="not-found-title">
      <Message>
        <h1 id="not-found-title">{copy.notFound.title}</h1>
        <p>{copy.notFound.text}</p>
        <ButtonLink href="/" icon="arrow">
          {copy.notFound.home}
        </ButtonLink>
      </Message>
    </Band>
  );
}
