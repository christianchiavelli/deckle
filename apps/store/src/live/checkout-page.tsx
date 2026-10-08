'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import {
  Band,
  Breadcrumbs,
  Button,
  ButtonLink,
  CartLine,
  CartLines,
  CheckoutForm,
  ChoiceCard,
  FieldPair,
  FormSection,
  Note,
  OrderSummary,
  PageHead,
  PanelNote,
  SelectField,
  TextField,
} from '@deckle/ui';
import { tokens as t } from '@deckle/tokens';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactNode, type SyntheticEvent, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNow } from '../components/clock';
import { useCopy } from '../copy/client';
import { lineOf, moneyOf, summaryOf } from '../views/cart';
import { type CheckoutField, readCheckout, refusedFields } from '../views/checkout';
import { imageAt } from '../views/images';
import { clockOf } from '../views/time';
import { EmptyCart, Layout } from './cart-page';
import {
  type CartViewFragment,
  CartPageDocument,
  type CheckoutInput,
  CopyCheckoutDocument,
  type CopyToPayFragment,
  PayForCopyDocument,
  PlaceOrderDocument,
} from './generated';
import { deadlineOf } from './hold';
import { refusalOf } from './refusal';

const Count = styled.span`
  color: ${t.text.secondary};
  font-variant-numeric: tabular-nums;
`;

const Place = styled(Button)`
  inline-size: 100%;
`;

/* Why the order did not go through. Empty, it leaves the flow, so it opens
   no gap above the button, and stays a live region all the same. */
const Said = styled.div`
  &:empty {
    position: absolute;
  }
`;

const Below = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  margin-block-start: ${t.space.gapXl};
`;

export interface Country {
  readonly code: string;
  readonly name: string;
}

/** The country the form opens on: the shop's own, when it ships there. */
const HOME = 'US';

export interface CheckoutLiveProps {
  /** Where the shop ships, read on the server. */
  readonly countries: readonly Country[];
  /** A drop whose held copy is paid for here; null for the cart. */
  readonly drop: string | null;
  /** When the server drew the page. */
  readonly now: number;
}

/**
 * One page, top to bottom: who to send the receipt to, where the tube goes,
 * how it travels and how it is paid, beside what the order comes to. The
 * cart's prints, or a drop's held copy alone.
 */
export function CheckoutLive({ countries, drop, now }: CheckoutLiveProps) {
  return drop === null ? (
    <CartCheckout countries={countries} />
  ) : (
    <CopyCheckout countries={countries} drop={drop} now={now} />
  );
}

function CartCheckout({ countries }: { countries: readonly Country[] }) {
  const copy = useCopy();
  const { checkout: text } = copy;
  const cartCrumbs = [{ label: text.cart, href: copy.path('/cart') }];
  const { data, error } = useQuery(CartPageDocument, { ssr: false });
  const [placeOrder] = useMutation(PlaceOrderDocument, {
    update: (cache) => {
      // A placed cart is gone: commerce starts a new one with the next print.
      cache.modify({
        id: cache.identify({ __typename: 'Cart' }),
        fields: {
          lines: () => [],
          quantity: () => 0,
          subtotal: () => null,
          shipping: () => null,
          total: () => null,
        },
      });
    },
  });

  if (data === undefined) {
    return <Waiting failed={error !== undefined} crumbs={cartCrumbs} />;
  }
  const { cart } = data;
  if (cart.lines.length === 0) {
    return <EmptyCart />;
  }
  return (
    <Checkout
      countries={countries}
      crumbs={cartCrumbs}
      total={moneyOf(cart.total, copy)}
      delivery={{
        value: 'standard-shipping',
        title: text.standard,
        price: moneyOf(cart.shipping, copy),
      }}
      summary={<CartSummary cart={cart} />}
      place={async (input) => {
        const { data: placed } = await placeOrder({ variables: { input } });
        return placed?.placeOrder.code ?? null;
      }}
    />
  );
}

function CopyCheckout({
  countries,
  drop,
  now: serverNow,
}: {
  countries: readonly Country[];
  drop: string;
  now: number;
}) {
  const copy = useCopy();
  const { checkout: text } = copy;
  const { data, error } = useQuery(CopyCheckoutDocument, {
    variables: { drop },
    ssr: false,
    fetchPolicy: 'network-only',
  });
  const [payForCopy] = useMutation(PayForCopyDocument, {
    update: (cache) => {
      // The copy is sold now; the drop's page reads it afresh.
      cache.evict({ id: cache.identify({ __typename: 'DropCopy', drop }) });
    },
  });
  const now = useNow(serverNow, 1000);

  const crumbs = [
    { label: data?.drop?.page?.headline ?? copy.drops.title, href: copy.path(`/drops/${drop}`) },
  ];
  if (data === undefined) {
    return <Waiting failed={error !== undefined} crumbs={crumbs} />;
  }
  const edition = data.drop;
  const mine = edition?.viewerCopy ?? null;
  const deadline = mine ? deadlineOf(mine, now) : null;
  const left = deadline === null ? 0 : Math.max(0, Math.round((deadline - now) / 1000));
  if (mine?.state !== 'HELD' || edition === null || left === 0) {
    return <NotHeld drop={drop} />;
  }

  const price = moneyOf(edition.price, copy);
  return (
    <Checkout
      countries={countries}
      crumbs={crumbs}
      total={price}
      delivery={{ value: 'edition-shipping', title: text.numbered, price: text.included }}
      summary={<CopySummary edition={edition} number={mine.number} left={left} />}
      place={async (input) => {
        const { data: paid } = await payForCopy({ variables: { drop, input } });
        return paid?.payForCopy.code ?? null;
      }}
    />
  );
}

function Waiting({
  failed,
  crumbs,
}: {
  failed: boolean;
  crumbs: readonly { label: string; href: string }[];
}) {
  const { checkout: text } = useCopy();
  return (
    <Band aria-labelledby="checkout-title" aria-busy={!failed}>
      <PageHead
        id="checkout-title"
        title={text.title}
        crumbs={<Breadcrumbs label={text.crumbs} items={crumbs} />}
      />
      {failed && (
        <Below>
          <Note>{text.failed}</Note>
        </Below>
      )}
    </Band>
  );
}

function NotHeld({ drop }: { drop: string }) {
  const copy = useCopy();
  const { checkout: text } = copy;
  return (
    <Band aria-labelledby="checkout-title">
      <PageHead id="checkout-title" title={text.notHeldTitle} lede={text.notHeld} />
      <Below>
        <ButtonLink href={copy.path(`/drops/${drop}`)} variant="accent" icon="arrow">
          {text.toDrop}
        </ButtonLink>
      </Below>
    </Band>
  );
}

function CartSummary({ cart }: { cart: CartViewFragment }) {
  const copy = useCopy();
  const { checkout: text } = copy;
  return (
    <OrderSummary
      id="summary-title"
      title={text.summary}
      rows={summaryOf(cart, copy)}
      lines={
        <CartLines>
          {cart.lines.map((line) => {
            const shown = lineOf(line, copy);
            return (
              <CartLine
                key={shown.id}
                {...shown}
                quantity={<Count>× {shown.quantity}</Count>}
                remove={null}
                level="h3"
              />
            );
          })}
        </CartLines>
      }
    />
  );
}

function CopySummary({
  edition,
  number,
  left,
}: {
  edition: CopyToPayFragment;
  number: number;
  left: number;
}) {
  const copy = useCopy();
  const { checkout: text } = copy;
  const price = moneyOf(edition.price, copy);
  const image = edition.artwork?.image ?? null;
  const title = edition.artwork?.title ?? edition.slug;
  return (
    <OrderSummary
      id="summary-title"
      title={text.summary}
      rows={[
        { label: text.copyRow(number, edition.editionSize), value: price },
        { label: copy.cart.shipping, value: text.included },
        { label: copy.cart.total, value: price },
      ]}
      lines={
        <CartLines>
          <CartLine
            href={copy.path(`/drops/${edition.slug}`)}
            image={
              image && {
                src: imageAt(image.url, 'thumb'),
                width: image.width,
                height: image.height,
              }
            }
            title={text.copyTitle(title, number, edition.editionSize)}
            meta={[edition.artwork?.artist?.name, edition.artwork?.date].filter(Boolean).join(', ')}
            size={text.copySize(edition.paperSize ?? '—', number, edition.editionSize)}
            quantity={null}
            total={price}
            remove={null}
            level="h3"
          />
        </CartLines>
      }
    >
      <PanelNote icon="key" title={text.held(clockOf(left))}>
        {text.heldText(number)}
      </PanelNote>
    </OrderSummary>
  );
}

interface CheckoutProps {
  readonly countries: readonly Country[];
  readonly crumbs: readonly { label: string; href: string }[];
  /** "$282", on the button that places the order. */
  readonly total: string;
  readonly delivery: { readonly value: string; readonly title: string; readonly price: string };
  readonly summary: ReactNode;
  /** Sends the form to the gateway: the order's code once placed. */
  readonly place: (input: CheckoutInput) => Promise<string | null>;
}

function Checkout({ countries, crumbs, total, delivery, summary, place }: CheckoutProps) {
  const copy = useCopy();
  const { checkout: text } = copy;
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [invalid, setInvalid] = useState<readonly CheckoutField[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const home = countries.some((country) => country.code === HOME) ? HOME : countries[0]?.code;

  /** Marks the fields that would be refused, and takes the reader to the first. */
  function refuse(fields: readonly CheckoutField[]) {
    setInvalid(fields);
    const [first] = fields;
    const field = first === undefined ? null : form.current?.elements.namedItem(first);
    if (field instanceof HTMLElement) {
      field.focus();
    }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setSaid(null);
    const read = readCheckout(Object.fromEntries(new FormData(event.currentTarget)));
    if (!read.ok) {
      refuse(read.fields);
      return;
    }
    setInvalid([]);
    setSending(true);
    try {
      const code = await place(read.input);
      if (code !== null) {
        // The order's page in this edition; typed routes cannot follow the edition's prefix.
        router.push(copy.path(`/orders/${code}`) as Route);
        return;
      }
      setSaid(text.failed);
    } catch (error) {
      const refusal = refusalOf(error);
      const fields = refusedFields(refusal?.extensions);
      if (fields.length > 0) {
        refuse(fields);
      } else if (refusal?.code === 'PAYMENT_FAILED') {
        setSaid(text.paymentFailed);
      } else if (refusal?.code === 'PAYMENT_IN_PROGRESS') {
        setSaid(text.inProgress);
      } else if (refusal?.code === 'CART_EMPTY' || refusal?.code === 'NO_HOLD') {
        // The cart or the hold is gone: the page shows why once it reads it again.
        router.refresh();
      } else {
        setSaid(text.failed);
      }
    }
    setSending(false);
  }

  const errorOf = (field: CheckoutField) =>
    invalid.includes(field) ? text.invalid[field] : undefined;

  return (
    <Band aria-labelledby="checkout-title">
      <PageHead
        id="checkout-title"
        title={text.title}
        crumbs={<Breadcrumbs label={text.crumbs} items={crumbs} />}
      />
      <Layout>
        <CheckoutForm
          ref={form}
          noValidate
          aria-labelledby="checkout-title"
          onSubmit={(event) => void submit(event)}
        >
          <FormSection title={text.contact} lede={text.contactLede}>
            <TextField
              label={text.email}
              type="email"
              name="email"
              autoComplete="email"
              error={errorOf('email')}
            />
          </FormSection>
          <FormSection title={text.address}>
            <TextField
              label={text.fullName}
              name="fullName"
              autoComplete="name"
              error={errorOf('fullName')}
            />
            <TextField
              label={text.street}
              name="streetLine1"
              autoComplete="address-line1"
              error={errorOf('streetLine1')}
            />
            <TextField
              label={text.street2}
              hint={text.street2Hint}
              name="streetLine2"
              autoComplete="address-line2"
              error={errorOf('streetLine2')}
            />
            <FieldPair>
              <TextField
                label={text.city}
                name="city"
                autoComplete="address-level2"
                error={errorOf('city')}
              />
              <TextField
                label={text.postalCode}
                name="postalCode"
                autoComplete="postal-code"
                error={errorOf('postalCode')}
              />
            </FieldPair>
            <SelectField
              label={text.country}
              name="countryCode"
              autoComplete="country"
              options={countries.map((country) => ({ value: country.code, label: country.name }))}
              defaultValue={home}
              error={errorOf('countryCode')}
            />
          </FormSection>
          <FormSection title={text.delivery}>
            <ChoiceCard
              name="shipping"
              value={delivery.value}
              defaultChecked
              title={delivery.title}
              detail={text.tube}
              price={delivery.price}
            />
          </FormSection>
          <FormSection title={text.payment}>
            <PanelNote icon="info" title={text.testTitle}>
              {text.test}
            </PanelNote>
          </FormSection>
          <Said role="status">{said !== null && <Note>{said}</Note>}</Said>
          <Place type="submit" icon="bag" disabled={sending} aria-busy={sending || undefined}>
            {sending ? text.placing : text.place(total)}
          </Place>
        </CheckoutForm>
        {summary}
      </Layout>
    </Band>
  );
}
