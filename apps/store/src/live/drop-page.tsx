'use client';

import { useMutation, useQuery, useSubscription } from '@apollo/client/react';
import {
  Band,
  Button,
  ButtonLink,
  Chip,
  Copies,
  CopiesKey,
  type CopyState,
  Countdown,
  EditionFacts,
  PasskeyDialog,
  Stage,
  Tally,
  TextButton,
  TextLink,
  typeRole,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNow } from '../components/clock';
import { copy } from '../copy';
import { marksOf, soonChipOf, type Stock, standingOf, tallyOf } from '../views/drops';
import { leftToPay, untilOpening } from '../views/time';
import {
  ClaimCopyDocument,
  DropLiveDocument,
  DropStockChangedDocument,
  ReleaseCopyDocument,
} from './generated';
import { deadlineOf } from './hold';
import { usePasskeys } from './passkeys';
import { refusalOf } from './refusal';

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

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapLg};
`;

const Small = styled.p`
  font-size: 0.8125rem;
  opacity: 0.85;
`;

/* What the gateway refused, said where the button was pressed. Empty, it
   leaves the flow, so it opens no gap, and stays a live region all the same. */
const Said = styled.p`
  font-size: 0.875rem;
  font-weight: ${t.type.label.weight};

  &:empty {
    position: absolute;
  }
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

export interface DropLiveProps {
  readonly slug: string;
  readonly editionSize: number;
  readonly opensAt: string;
  readonly headline: string;
  readonly paragraph: string | null;
  /** "$180", or a dash. */
  readonly price: string;
  /** "Thu 15 Oct, 18:00 UTC". */
  readonly opening: string;
  readonly image: {
    readonly src: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
  } | null;
  /** The copies as the server read them, a second old at most, until the browser has its own. */
  readonly stock: Stock | null;
  /** When the server drew the page. */
  readonly now: number;
}

const { drop: text, drops: words } = copy;

/**
 * A drop's page, the part that moves: whether it is open, the copies as they
 * are claimed, and the reader's own copy, held or paid. The copies come from
 * the gateway as each changes, over a WebSocket; the reader's copy, and the
 * way in with a passkey, from this browser's session.
 */
export function DropLive(props: DropLiveProps) {
  const { slug, editionSize } = props;
  const now = useNow(props.now, 1000);
  const soon = Date.parse(props.opensAt) > now;

  const { data, refetch } = useQuery(DropLiveDocument, {
    variables: { slug },
    ssr: false,
    fetchPolicy: 'cache-and-network',
  });
  useSubscription(DropStockChangedDocument, {
    variables: { drop: slug },
    skip: soon,
    onData: ({ client, data: change }) => {
      const stock = change.data?.dropStockChanged;
      if (stock) {
        client.cache.modify({
          id: client.cache.identify({ __typename: 'Drop', slug }),
          fields: { stock: () => stock },
        });
      }
    },
  });

  const [claimCopy, claiming] = useMutation(ClaimCopyDocument, {
    update: (cache, { data: claimed }) => {
      if (claimed) {
        cache.modify({
          id: cache.identify({ __typename: 'Drop', slug }),
          fields: {
            viewerCopy: (_, { toReference }) =>
              toReference({ __typename: 'DropCopy', drop: slug }) ?? null,
          },
        });
      }
    },
  });
  const [releaseCopy, releasing] = useMutation(ReleaseCopyDocument, {
    update: (cache) => {
      cache.modify({
        id: cache.identify({ __typename: 'Drop', slug }),
        fields: { viewerCopy: () => null },
      });
      cache.evict({ id: cache.identify({ __typename: 'DropCopy', drop: slug }) });
    },
  });

  const passkeys = usePasskeys();
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  const live = data?.drop ?? null;
  const stock: Stock | null = live?.stock ?? props.stock;
  const mine = live?.viewerCopy ?? null;
  const signedIn = Boolean(data?.viewer);
  const deadline = mine ? deadlineOf(mine, now) : null;
  const secondsLeft = deadline === null ? null : Math.max(0, Math.round((deadline - now) / 1000));
  const held = mine?.state === 'HELD' && secondsLeft !== null && secondsLeft > 0;
  const sold = mine?.state === 'SOLD';
  const lapsed = mine?.state === 'HELD' && secondsLeft === 0;

  // A hold whose ten minutes ran out is open again: ask where things stand now.
  useEffect(() => {
    if (lapsed) {
      void refetch();
    }
  }, [lapsed, refetch]);

  /** The claim itself, once this browser is signed in. */
  async function take() {
    try {
      await claimCopy({ variables: { drop: slug } });
    } catch (error) {
      const code = refusalOf(error)?.code;
      if (code === 'UNAUTHENTICATED') {
        passkeys.reset();
        setAsking(true);
        return;
      }
      setSaid(
        code !== undefined && code in text.refused
          ? text.refused[code as keyof typeof text.refused]
          : text.failed,
      );
      // Whatever was refused, the copies have moved on since this page last read them.
      void refetch();
    }
  }

  /**
   * "Claim a copy": straight away when signed in, else the way in first. Pressed
   * before this browser's session was read, it reads it first, rather than the
   * button waiting greyed out on every visit.
   */
  async function claim() {
    setSaid(null);
    let current = data;
    if (current === undefined) {
      try {
        current = (await refetch()).data;
      } catch {
        setSaid(text.failed);
        return;
      }
    }
    if (current?.drop?.viewerCopy) {
      // Held or bought already: the page shows it now.
      return;
    }
    if (!current?.viewer) {
      passkeys.reset();
      setAsking(true);
      return;
    }
    await take();
  }

  async function signAndClaim(way: 'use' | 'make') {
    if (!(await passkeys.sign(way))) {
      return;
    }
    setAsking(false);
    // A passkey made before may bring an account that has a copy of this drop already.
    const { data: fresh } = await refetch();
    if (!fresh?.drop?.viewerCopy) {
      await take();
    }
  }

  async function letGo() {
    setSaid(null);
    try {
      await releaseCopy({ variables: { drop: slug } });
    } catch {
      setSaid(text.failed);
    }
  }

  const open = stock?.open ?? null;
  const number = mine?.number ?? null;
  const chip = held
    ? text.held
    : sold
      ? text.yours
      : soon
        ? soonChipOf(props, now, copy)
        : open === 0 && stock?.held === 0
          ? text.allClaimed
          : text.openNow;
  const opening = untilOpening(Date.parse(props.opensAt) - now, copy);
  const paying = secondsLeft === null ? null : leftToPay(secondsLeft, copy);
  const standing = stock && standingOf(stock, editionSize, copy);
  const shown: CopyState[] =
    number === null ? ['open', 'held', 'claimed'] : ['open', 'held', 'claimed', 'yours'];

  return (
    <>
      {asking && (
        <PasskeyDialog
          id="passkey-title"
          open
          step={passkeys.step}
          title={copy.passkey.title}
          text={copy.passkey.text}
          use={copy.passkey.use}
          make={copy.passkey.make}
          waiting={copy.passkey.waiting}
          failed={passkeys.unsupported ? copy.passkey.unsupported : copy.passkey.failed}
          small={copy.passkey.small}
          close={copy.passkey.close}
          onUse={() => void signAndClaim('use')}
          onMake={() => void signAndClaim('make')}
          onClose={() => {
            setAsking(false);
          }}
        />
      )}
      <Band tone="feature" aria-labelledby="drop-title">
        <Grid>
          <Words>
            <Chip tone="accent">{chip}</Chip>
            <h1 id="drop-title">
              {held && number !== null
                ? text.heldTitle(number, editionSize)
                : sold && number !== null
                  ? text.soldTitle(number, editionSize)
                  : props.headline}
            </h1>
            {held && number !== null ? (
              <p>{text.heldText(number, editionSize)}</p>
            ) : sold && number !== null ? (
              <p>{text.soldText(number, editionSize)}</p>
            ) : (
              props.paragraph && <p>{props.paragraph}</p>
            )}

            {soon && <Countdown label={opening.label} units={opening.units} />}
            {held && paying && <Countdown label={paying.label} units={paying.units} />}
            {!soon && !held && stock && <Tally items={tallyOf(stock, copy)} />}

            {soon && (
              <EditionFacts
                items={[
                  { term: words.opensTerm, detail: props.opening },
                  { term: words.price, detail: props.price },
                  { term: words.limit, detail: words.onePerPerson },
                ]}
              />
            )}

            <Actions>
              {held ? (
                <>
                  <ButtonLink href={`/checkout?drop=${slug}`} variant="accent" icon="bag">
                    {text.pay(props.price)}
                  </ButtonLink>
                  <TextButton
                    tone="onFeature"
                    disabled={releasing.loading}
                    onClick={() => void letGo()}
                  >
                    {text.letGo}
                  </TextButton>
                </>
              ) : sold && mine.orderCode ? (
                <ButtonLink href={`/orders/${mine.orderCode}`} variant="accent" icon="arrow">
                  {text.order}
                </ButtonLink>
              ) : soon ? (
                !signedIn && (
                  <ButtonLink href="/account" variant="accent" icon="key">
                    {words.readyWithPasskey}
                  </ButtonLink>
                )
              ) : (
                <Button
                  variant="accent"
                  icon="key"
                  disabled={claiming.loading || open === 0}
                  aria-busy={claiming.loading || undefined}
                  onClick={() => void claim()}
                >
                  {words.claim}
                </Button>
              )}
              {!held && (
                <TextLink href="/about/drops" tone="onFeature" icon="arrow">
                  {words.howTheyWork}
                </TextLink>
              )}
            </Actions>
            <Said role="status">
              {said ?? (!soon && !held && !sold && open === 0 ? text.noneOpen : null)}
            </Said>
            {!held && !sold && !signedIn && <Small>{text.small}</Small>}
          </Words>
          {props.image && (
            <Stage image={props.image}>
              <Pencil aria-hidden="true">
                {number ?? <Blank />}/{editionSize}
              </Pencil>
            </Stage>
          )}
        </Grid>
      </Band>

      <Band aria-labelledby="copies-title">
        <CopiesLayout>
          <CopiesText>
            <h2 id="copies-title">{text.copiesTitle(editionSize)}</h2>
            {!soon && <Live>{text.live}</Live>}
            <p>{text.copiesText}</p>
            <CopiesKey words={words.copyWords} shown={shown} />
          </CopiesText>
          {stock && standing && (
            <Copies
              total={editionSize}
              states={marksOf(stock, number)}
              words={words.copyWords}
              label={standing.label}
              caption={standing.caption}
            />
          )}
        </CopiesLayout>
      </Band>
    </>
  );
}
