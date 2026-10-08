'use client';

import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  Band,
  Button,
  ButtonLink,
  Chip,
  Note,
  PageHead,
  PanelNote,
  SectionHead,
  TextButton,
  TextLink,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import { useState } from 'react';
import styled from 'styled-components';
import { useNow } from '../components/clock';
import { useCopy } from '../copy/client';
import { moneyOf } from '../views/cart';
import { imageAt } from '../views/images';
import { clockOf, dateOf } from '../views/time';
import { AccountPageDocument, type AccountPageQuery, SignOutDocument } from './generated';
import { deadlineOf } from './hold';
import { usePasskeys } from './passkeys';

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
  gap: ${t.space.gapMd};
  max-inline-size: 40rem;
`;

/* How the passkey went. Empty, it leaves the flow, so it opens no gap above
   the note under it, and stays a live region all the same. */
const Status = styled.p`
  font-size: 0.875rem;
  font-weight: ${t.type.label.weight};

  &:empty {
    position: absolute;
  }
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

const None = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapMd};
  padding-block: ${t.space.gapLg};

  p {
    color: ${t.text.secondary};
  }
`;

/** An account is a passkey: the two ways in, or, once in, the copies it holds and the way out. */
export function AccountLive({ now: serverNow }: { now: number }) {
  const { account: text } = useCopy();
  const { data, error } = useQuery(AccountPageDocument, {
    ssr: false,
    fetchPolicy: 'cache-and-network',
  });

  if (data === undefined) {
    return (
      <Band aria-labelledby="account-title" aria-busy={error === undefined}>
        {error !== undefined && (
          <>
            <PageHead id="account-title" title={text.title} />
            <Notes>
              <Note>{text.failed}</Note>
            </Notes>
          </>
        )}
      </Band>
    );
  }
  return data.viewer === null ? (
    <SignIn />
  ) : (
    <Account viewer={data.viewer} drops={data.drops} serverNow={serverNow} />
  );
}

function SignIn() {
  const copy = useCopy();
  const { account: text } = copy;
  const passkeys = usePasskeys();
  const busy = passkeys.step === 'waiting';
  return (
    <Band aria-labelledby="account-title">
      <PageHead id="account-title" title={text.signInTitle} lede={text.signInLede} />
      <Ways>
        <Button
          variant="accent"
          icon="key"
          disabled={busy}
          onClick={() => void passkeys.sign('use')}
        >
          {copy.passkey.use}
        </Button>
        <Outline disabled={busy} onClick={() => void passkeys.sign('make')}>
          {copy.passkey.make}
        </Outline>
      </Ways>
      <Notes>
        <Status role="status">
          {passkeys.step === 'waiting'
            ? copy.passkey.waiting
            : passkeys.step === 'failed'
              ? passkeys.unsupported
                ? copy.passkey.unsupported
                : copy.passkey.failed
              : null}
        </Status>
        <PanelNote icon="key" title={text.keepsTitle}>
          {text.keeps}
        </PanelNote>
      </Notes>
    </Band>
  );
}

type Viewer = NonNullable<AccountPageQuery['viewer']>;

function Account({
  viewer,
  drops,
  serverNow,
}: {
  viewer: Viewer;
  drops: AccountPageQuery['drops'];
  serverNow: number;
}) {
  const copy = useCopy();
  const { account: text } = copy;
  const client = useApolloClient();
  const now = useNow(serverNow, 1000);
  const [signOut, signingOut] = useMutation(SignOutDocument);
  const [failed, setFailed] = useState(false);

  async function leave() {
    setFailed(false);
    try {
      await signOut();
      // Everything read for the account goes with it; the cart stays, as it is the browser's.
      await client.resetStore();
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <Band aria-labelledby="account-title">
        <PageHead
          id="account-title"
          title={text.title}
          lede={text.since(dateOf(viewer.since, copy))}
        />
      </Band>
      <Band tone="band" aria-labelledby="copies-title">
        <SectionHead id="copies-title" title={text.copies} />
        {viewer.copies.length === 0 ? (
          <None>
            <p>{text.noCopies}</p>
            <TextLink href={copy.path('/drops')} icon="arrow">
              {text.seeDrops}
            </TextLink>
          </None>
        ) : (
          <Copies>
            {viewer.copies.map((mine) => {
              const drop = drops.find((each) => each.slug === mine.drop);
              const image = drop?.artwork?.image ?? null;
              const price = moneyOf(drop?.price ?? null, copy);
              const size = drop?.editionSize ?? 0;
              const deadline = deadlineOf(mine, now);
              const left =
                deadline === null ? null : Math.max(0, Math.round((deadline - now) / 1000));
              const held = mine.state === 'HELD';
              return (
                <Copy key={mine.drop}>
                  <Mat>
                    {image && (
                      <img
                        src={imageAt(image.url, 'thumb')}
                        width={image.width}
                        height={image.height}
                        alt=""
                      />
                    )}
                  </Mat>
                  <Words>
                    <Chip tone={held ? 'accent' : 'soft'}>
                      {held ? text.heldChip(clockOf(left ?? 0)) : text.paidChip}
                    </Chip>
                    <h3>{text.copyTitle(drop?.artwork?.title ?? mine.drop, mine.number, size)}</h3>
                    <p>{text.copyDetail(drop?.paperSize ?? '—', price)}</p>
                  </Words>
                  <Action>
                    {held ? (
                      <ButtonLink
                        href={copy.path(`/checkout?drop=${mine.drop}`)}
                        variant="accent"
                        icon="bag"
                      >
                        {text.pay(price)}
                      </ButtonLink>
                    ) : (
                      mine.orderCode && (
                        <TextLink href={copy.path(`/orders/${mine.orderCode}`)} icon="arrow">
                          {text.order(mine.orderCode)}
                        </TextLink>
                      )
                    )}
                  </Action>
                </Copy>
              );
            })}
          </Copies>
        )}
        <Out>
          <TextButton disabled={signingOut.loading} onClick={() => void leave()}>
            {text.signOut}
          </TextButton>
          <div role="status">{failed && <Note>{copy.drop.failed}</Note>}</div>
        </Out>
      </Band>
    </>
  );
}
