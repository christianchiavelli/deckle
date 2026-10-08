'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  Band,
  ButtonLink,
  CartLine,
  CartLines,
  Note,
  OrderSummary,
  PageHead,
  PanelNote,
  Quantity,
  TextButton,
  TextLink,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import { useState } from 'react';
import styled from 'styled-components';
import { useCopy } from '../copy/client';
import { lineOf, summaryOf } from '../views/cart';
import { CartPageDocument, SetCartLineQuantityDocument } from './generated';
import { refusalOf } from './refusal';

/** The lines beside their sum, from a laptop up: the cart's and the checkout's layout. */
export const Layout = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  margin-block-start: ${t.space.gap2xl};

  @media ${media.md} {
    grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
    align-items: start;
    gap: ${t.space.gap3xl};
  }
`;

const Actions = styled.div`
  display: grid;
  gap: ${t.space.gapMd};
  justify-items: center;

  > a:first-child {
    inline-size: 100%;
  }
`;

const Below = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  margin-block-start: ${t.space.gapXl};
`;

/** The cart's empty state: what to do instead, here and at a checkout with nothing to pay for. */
export function EmptyCart() {
  const copy = useCopy();
  const { cart: text } = copy;
  return (
    <Band aria-labelledby="cart-title">
      <PageHead id="cart-title" title={text.emptyTitle} lede={text.emptyLede} />
      <Below>
        <ButtonLink href={copy.path('/prints')} icon="arrow">
          {text.browse}
        </ButtonLink>
      </Below>
    </Band>
  );
}

/**
 * The cart: each print with its size and how many, the sum beside it, and the
 * way to pay. It is this browser's, so it is read in the browser; each change
 * answers with the whole cart, which the header counts too.
 */
export function CartLive() {
  const copy = useCopy();
  const { cart: text } = copy;
  const { data, error, refetch } = useQuery(CartPageDocument, { ssr: false });
  const [setQuantity] = useMutation(SetCartLineQuantityDocument);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <Band aria-labelledby="cart-title" aria-busy={error === undefined}>
        <PageHead id="cart-title" title={text.title} lede={text.lede} />
        {error !== undefined && (
          <Below>
            <Note>{text.failed}</Note>
          </Below>
        )}
      </Band>
    );
  }

  const { cart } = data;
  if (cart.lines.length === 0) {
    return <EmptyCart />;
  }

  async function change(line: string, quantity: number) {
    setBusy(line);
    setSaid(null);
    try {
      await setQuantity({ variables: { line, quantity } });
    } catch (failure) {
      // A line already gone means another tab changed the cart: show the cart as it is.
      if (refusalOf(failure)?.code === 'NO_SUCH_LINE') {
        await refetch();
      } else {
        setSaid(text.changeFailed);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Band aria-labelledby="cart-title">
      <PageHead id="cart-title" title={text.title} lede={text.lede} />
      <Layout>
        <div>
          <CartLines>
            {cart.lines.map((line) => {
              const shown = lineOf(line, copy);
              return (
                <CartLine
                  key={shown.id}
                  {...shown}
                  quantity={
                    <Quantity
                      value={shown.quantity}
                      label={text.quantity(shown.title, shown.paper)}
                      fewer={text.fewer}
                      more={text.more}
                      busy={busy === shown.id}
                      onChange={(quantity) => void change(shown.id, quantity)}
                    />
                  }
                  remove={
                    <TextButton
                      disabled={busy === shown.id}
                      onClick={() => void change(shown.id, 0)}
                    >
                      {text.remove}
                    </TextButton>
                  }
                />
              );
            })}
          </CartLines>
          <div role="status">
            {said !== null && (
              <Below>
                <Note>{said}</Note>
              </Below>
            )}
          </div>
        </div>
        <OrderSummary id="summary-title" title={text.summary} rows={summaryOf(cart, copy)}>
          <Actions>
            <ButtonLink href={copy.path('/checkout')} icon="arrow">
              {text.checkout}
            </ButtonLink>
            <TextLink href={copy.path('/prints')}>{text.keepBrowsing}</TextLink>
          </Actions>
          <PanelNote icon="info" title={text.testTitle}>
            {text.test}
          </PanelNote>
        </OrderSummary>
      </Layout>
    </Band>
  );
}
