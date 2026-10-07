import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Button, ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { TextButton } from '../components/text-link/text-link.tsx';
import { Band, SectionHead } from '../sections/band.tsx';
import { PanelNote } from '../sections/checkout.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { Chrome } from './chrome.tsx';
import { imageOf, work } from './fixtures.ts';

const Ways = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${t.space.gapMd};
  margin-block: ${t.space.gap2xl} ${t.space.gapXl};
`;

const Outline = styled(Button)`
  && {
    border: ${t.strokeWidth.hairline} solid ${t.stroke.strong};
    background: none;
    color: ${t.text.primary};
  }

  &&:hover:not(:disabled) {
    background: ${t.surface.sheet};
  }
`;

const Notes = styled.div`
  display: grid;
  max-inline-size: 40rem;
`;

const Copies = styled.ul`
  display: grid;
  border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
`;

const Copy = styled.li`
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: ${t.space.gapMd} ${t.space.gapLg};
  align-items: center;
  padding-block: ${t.space.gapLg};
  border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};

  @media ${media.md} {
    grid-template-columns: 5.5rem minmax(0, 1fr) auto;
  }
`;

const Mat = styled.span`
  display: block;
  aspect-ratio: 1;
  padding: 0.5rem;
  border-radius: ${t.radius.control};
  background: ${t.surface.stage};

  img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
  }
`;

const Words = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gap2xs};

  h3 {
    font-size: 1.0625rem;
    font-weight: ${t.type.label.weight};
  }

  p {
    color: ${t.text.secondary};
    font-size: 0.9375rem;
  }
`;

const Action = styled.div`
  grid-column: 2;

  @media ${media.md} {
    grid-column: auto;
  }
`;

const Out = styled.div`
  margin-block-start: ${t.space.gapXl};
`;

export interface AccountPageProps {
  /** Signed in: the copies claimed with this passkey, and the way out. */
  signedIn?: boolean;
}

/** An account is a passkey: the two ways in, or, once in, the copies it holds. */
export function AccountPage({ signedIn = false }: AccountPageProps) {
  if (!signedIn) {
    return (
      <Chrome>
        <Band aria-labelledby="account-title">
          <PageHead
            id="account-title"
            title="Sign in with a passkey"
            lede="Your account is a passkey your device keeps: no password to choose, remember or leak. It is only needed for drops; prints in the cart need none."
          />
          <Ways>
            <Button variant="accent" icon="key">
              Use my passkey
            </Button>
            <Outline>Make a passkey</Outline>
          </Ways>
          <Notes>
            <PanelNote icon="key" title="What Deckle keeps">
              The passkey’s public half and a number that tells this account apart. Your face,
              finger or PIN stay on your device.
            </PanelNote>
          </Notes>
        </Band>
      </Chrome>
    );
  }

  const melencolia = work('melencolia-i');
  return (
    <Chrome>
      <Band aria-labelledby="account-title">
        <PageHead
          id="account-title"
          title="Your account"
          lede="Signed in with a passkey made on this device on 7 Oct 2026."
        />
      </Band>
      <Band tone="band" aria-labelledby="copies-title">
        <SectionHead id="copies-title" title="Your copies" />
        <Copies>
          <Copy>
            <Mat>
              <img {...imageOf(melencolia)} alt="" />
            </Mat>
            <Words>
              <Chip tone="accent">Held for you · 9:42 left</Chip>
              <h3>Melencolia I, copy 7 of 50</h3>
              <p>A3, numbered in pencil · $180</p>
            </Words>
            <Action>
              <ButtonLink href="/checkout?drop=melencolia-i-numbered" variant="accent" icon="bag">
                Pay $180
              </ButtonLink>
            </Action>
          </Copy>
        </Copies>
        <Out>
          <TextButton>Sign out</TextButton>
        </Out>
      </Band>
    </Chrome>
  );
}
