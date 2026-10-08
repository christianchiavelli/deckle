'use client';

import { useQuery } from '@apollo/client/react';
import {
  Band,
  ButtonLink,
  CartLine,
  CartLines,
  Chip,
  Note,
  OrderSummary,
  PageHead,
  PanelNote,
} from '@deckle/ui';
import { MISSING } from '@deckle/ui/format';
import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { copy } from '../copy';
import { lineOf, orderSummaryOf } from '../views/cart';
import { placedOf } from '../views/orders';
import { Layout } from './cart-page';
import { PlacedOrderDocument } from './generated';

const Count = styled.span`
  color: ${t.text.secondary};
  font-variant-numeric: tabular-nums;
`;

const Head = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapMd};
`;

const Facts = styled.dl`
  display: grid;
  gap: ${t.space.gapSm};

  > div {
    display: grid;
    gap: 0.125rem;
  }

  dt {
    color: ${t.text.secondary};
    font-size: 0.875rem;
  }
`;

const Below = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  margin-block-start: ${t.space.gapXl};
`;

const { order: text } = copy;

/**
 * The order placed: its number, where the receipt went, what is in it and
 * what it came to. Right after checkout it is already in this browser's
 * cache; read again later, it is there only for the browser that placed it.
 */
export function OrderLive({ code }: { code: string }) {
  const { data, error } = useQuery(PlacedOrderDocument, { variables: { code }, ssr: false });

  if (!data?.order) {
    const waiting = data === undefined && error === undefined;
    return (
      <Band aria-labelledby="order-title" aria-busy={waiting}>
        {!waiting && (
          <>
            <PageHead id="order-title" title={text.missingTitle} lede={text.missing} />
            <Below>
              {error !== undefined && <Note>{copy.cart.failed}</Note>}
              <ButtonLink href="/prints" icon="arrow">
                {text.browse}
              </ButtonLink>
            </Below>
          </>
        )}
      </Band>
    );
  }

  const { order } = data;
  const placed = placedOf(order, copy);
  return (
    <Band aria-labelledby="order-title">
      <Head>
        <Chip tone="soft">{text.placed}</Chip>
        <PageHead id="order-title" title={placed.title} lede={placed.lede} />
      </Head>
      <Layout>
        <CartLines>
          {order.lines.map((line) => {
            const shown = lineOf(line, copy);
            return (
              <CartLine
                key={shown.id}
                {...shown}
                quantity={<Count>× {shown.quantity}</Count>}
                remove={null}
              />
            );
          })}
        </CartLines>
        <OrderSummary
          id="summary-title"
          title={text.title(order.code)}
          rows={orderSummaryOf(order, copy)}
        >
          <Facts>
            <div>
              <dt>{text.shipTo}</dt>
              <dd>{placed.shipTo ?? MISSING}</dd>
            </div>
            <div>
              <dt>{text.paid}</dt>
              <dd>{placed.paid}</dd>
            </div>
          </Facts>
          <PanelNote icon="tube" title={text.nothingShipsTitle}>
            {text.nothingShips}
          </PanelNote>
          <ButtonLink href="/prints" icon="arrow">
            {text.keepBrowsing}
          </ButtonLink>
        </OrderSummary>
      </Layout>
    </Band>
  );
}
