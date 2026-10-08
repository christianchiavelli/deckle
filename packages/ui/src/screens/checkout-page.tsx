import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Breadcrumbs } from '../components/breadcrumbs/breadcrumbs.tsx';
import { Button } from '../components/button/button.tsx';
import { SelectField, TextField } from '../components/field/field.tsx';
import { Band } from '../sections/band.tsx';
import { CartLine, CartLines, OrderSummary } from '../sections/cart.tsx';
import {
  CheckoutForm,
  ChoiceCard,
  FieldPair,
  FormSection,
  PanelNote,
} from '../sections/checkout.tsx';
import { PageHead } from '../sections/page-head.tsx';
import {
  cartFixture,
  count,
  lineOf,
  melencoliaLine,
  money,
  rowsOf,
  SHIPPING,
  subtotal,
} from './cart-fixtures.ts';
import { Layout } from './cart-page.tsx';
import { Chrome } from './chrome.tsx';

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'BR', label: 'Brazil' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'JP', label: 'Japan' },
];

const Quantity = styled.span`
  color: ${t.text.secondary};
  font-variant-numeric: tabular-nums;
`;

const Place = styled(Button)`
  inline-size: 100%;
`;

export interface CheckoutPageProps {
  /** After a try to place the order with two fields wrong: each says why, and the first takes focus. */
  errors?: boolean;
  /** Paying for a numbered copy held in a drop: the copy alone, its clock beside it, shipping included. */
  drop?: boolean;
}

/**
 * One page, top to bottom: who to send the receipt to, where the tube goes,
 * how it travels and how it is paid, beside what the order comes to.
 */
export function CheckoutPage({ errors = false, drop = false }: CheckoutPageProps) {
  const total = drop ? money(18000) : money(subtotal(cartFixture) + SHIPPING);

  return (
    <Chrome cartCount={count(cartFixture)}>
      <Band aria-labelledby="checkout-title">
        <PageHead
          id="checkout-title"
          title="Checkout"
          crumbs={
            <Breadcrumbs
              label="Breadcrumb"
              items={[
                drop
                  ? { label: 'Melencolia I, in fifty copies', href: '/drops/melencolia-i-numbered' }
                  : { label: 'Cart', href: '/cart' },
              ]}
            />
          }
        />
        <Layout>
          <CheckoutForm noValidate aria-labelledby="checkout-title">
            <FormSection title="Contact" lede="For the receipt. Nothing else is sent to it.">
              <TextField
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                defaultValue={errors ? 'ana@example' : 'ana@example.com'}
                error={errors ? 'Enter an email address, such as you@example.com' : undefined}
              />
            </FormSection>
            <FormSection title="Shipping address">
              <TextField
                label="Full name"
                name="name"
                autoComplete="name"
                defaultValue="Ana Souza"
              />
              <TextField
                label="Address"
                name="street"
                autoComplete="address-line1"
                defaultValue="1000 Fifth Avenue"
              />
              <TextField
                label="Apartment, suite or floor"
                hint="If there is one"
                name="street2"
                autoComplete="address-line2"
              />
              <FieldPair>
                <TextField
                  label="City"
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={errors ? '' : 'New York'}
                  error={errors ? 'Enter a city' : undefined}
                />
                <TextField
                  label="Postcode"
                  name="postalCode"
                  autoComplete="postal-code"
                  defaultValue="10028"
                />
              </FieldPair>
              <SelectField
                label="Country"
                name="country"
                autoComplete="country"
                options={COUNTRIES}
                defaultValue="US"
              />
            </FormSection>
            <FormSection title="Delivery">
              <ChoiceCard
                name="shipping"
                value={drop ? 'edition-shipping' : 'standard-shipping'}
                defaultChecked
                title={drop ? 'Shipping for a numbered copy' : 'Standard shipping'}
                detail="Rolled in a tube, tracked, one flat rate wherever it goes."
                price={drop ? 'Included' : money(SHIPPING)}
              />
            </FormSection>
            <FormSection title="Payment">
              <PanelNote icon="info" title="A test payment">
                It settles at once and no money moves. Deckle is a portfolio project: the order is
                real, the payment and the parcel are not.
              </PanelNote>
            </FormSection>
            <Place type="submit" icon="bag">
              Place order · {total}
            </Place>
          </CheckoutForm>
          <OrderSummary
            id="summary-title"
            title="Your order"
            rows={
              drop
                ? [
                    { label: 'Copy 7 of 50', value: money(18000) },
                    { label: 'Shipping, rolled in a tube', value: 'Included' },
                    { label: 'Total', value: money(18000) },
                  ]
                : rowsOf(cartFixture)
            }
            lines={
              <CartLines>
                {drop ? (
                  <CartLine
                    {...lineOf(melencoliaLine)}
                    title={`${melencoliaLine.entry.shortTitle}, copy 7 of 50`}
                    size="A3, numbered 7/50 in pencil"
                    quantity={null}
                    total={money(18000)}
                    remove={null}
                    level="h3"
                  />
                ) : (
                  cartFixture.map((line) => (
                    <CartLine
                      key={line.entry.slug}
                      {...lineOf(line)}
                      quantity={<Quantity>× {line.quantity}</Quantity>}
                      remove={null}
                      level="h3"
                    />
                  ))
                )}
              </CartLines>
            }
          >
            {drop && (
              <PanelNote icon="key" title="Held for you · 9:42 left">
                Pay before the time runs out, or copy 7 goes back to the edition for the next
                person.
              </PanelNote>
            )}
          </OrderSummary>
        </Layout>
      </Band>
    </Chrome>
  );
}
