import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { Band } from '../sections/band.tsx';
import { CartLine, CartLines, OrderSummary } from '../sections/cart.tsx';
import { PanelNote } from '../sections/checkout.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { cartFixture, lineOf, rowsOf } from './cart-fixtures.ts';
import { Layout } from './cart-page.tsx';
import { Chrome } from './chrome.tsx';

const Quantity = styled.span`
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

/** The order placed: its number, where the receipt went, what is in it and what it came to. */
export function OrderPage() {
  return (
    <Chrome cartCount={0}>
      <Band aria-labelledby="order-title">
        <Head>
          <Chip tone="soft">Order placed</Chip>
          <PageHead
            id="order-title"
            title="Thank you, Ana"
            lede="Order DCK-7X2Q is placed, and its receipt is on its way to ana@example.com."
          />
        </Head>
        <Layout>
          <CartLines>
            {cartFixture.map((line) => (
              <CartLine
                key={line.entry.slug}
                {...lineOf(line)}
                quantity={<Quantity>× {line.quantity}</Quantity>}
                remove={null}
              />
            ))}
          </CartLines>
          <OrderSummary id="summary-title" title="Order DCK-7X2Q" rows={rowsOf(cartFixture)}>
            <Facts>
              <div>
                <dt>Shipping to</dt>
                <dd>Ana Souza, 1000 Fifth Avenue, New York 10028, United States of America</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>Test payment, settled on 7 Oct 2026</dd>
              </div>
            </Facts>
            <PanelNote icon="tube" title="Nothing ships">
              Deckle is a portfolio project: the order is in commerce&rsquo;s dashboard and the
              receipt in Mailpit, and the prints stay in the museum.
            </PanelNote>
            <ButtonLink href="/prints" icon="arrow">
              Keep browsing
            </ButtonLink>
          </OrderSummary>
        </Layout>
      </Band>
    </Chrome>
  );
}
