import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Quantity } from '../components/quantity/quantity.tsx';
import { TextButton, TextLink } from '../components/text-link/text-link.tsx';
import { Band } from '../sections/band.tsx';
import { CartLine, CartLines, OrderSummary } from '../sections/cart.tsx';
import { PanelNote } from '../sections/checkout.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { cartFixture, count, lineOf, rowsOf } from './cart-fixtures.ts';
import { Chrome } from './chrome.tsx';

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

const Empty = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  margin-block-start: ${t.space.gapXl};
`;

export interface CartPageProps {
  /** An empty cart: what to do instead. */
  empty?: boolean;
}

/** The cart: each print with its size and how many, the sum beside it, and the way to pay. */
export function CartPage({ empty = false }: CartPageProps) {
  const lines = empty ? [] : cartFixture;

  return (
    <Chrome cartCount={count(lines)}>
      <Band aria-labelledby="cart-title">
        {empty ? (
          <>
            <PageHead
              id="cart-title"
              title="Your cart is empty"
              lede="Each print is made when it is ordered, at the sizes its scan can hold. Every one the shop sells is on one page."
            />
            <Empty>
              <ButtonLink href="/prints" icon="arrow">
                Browse the prints
              </ButtonLink>
            </Empty>
          </>
        ) : (
          <>
            <PageHead
              id="cart-title"
              title="Your cart"
              lede="Each print is made when it is ordered: pigment on cotton rag, rolled in a tube."
            />
            <Layout>
              <CartLines>
                {lines.map((line) => {
                  const shown = lineOf(line);
                  return (
                    <CartLine
                      key={line.entry.slug}
                      {...shown}
                      quantity={
                        <Quantity
                          value={line.quantity}
                          label={`How many of ${shown.title}, ${line.size}`}
                          fewer="One fewer"
                          more="One more"
                        />
                      }
                      remove={<TextButton>Remove</TextButton>}
                    />
                  );
                })}
              </CartLines>
              <OrderSummary id="summary-title" title="Order summary" rows={rowsOf(lines)}>
                <Actions>
                  <ButtonLink href="/checkout" icon="arrow">
                    Check out
                  </ButtonLink>
                  <TextLink href="/prints">Keep browsing</TextLink>
                </Actions>
                <PanelNote icon="info" title="A test checkout">
                  No card is asked for and nothing ships: Deckle is a portfolio project.
                </PanelNote>
              </OrderSummary>
            </Layout>
          </>
        )}
      </Band>
    </Chrome>
  );
}
