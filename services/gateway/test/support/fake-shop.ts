import { randomUUID } from 'node:crypto';
import { decodeJwt } from 'jose';
import * as fixtures from './fixtures.js';

/** A drop's edition, as the commerce seed makes it: a product named after the drop. */
export interface FakeEdition {
  readonly slug: string;
  readonly variantId: string;
  readonly price: number;
  readonly editionSize: number;
}

export const EDITIONS: readonly FakeEdition[] = [
  { slug: 'melencolia-i-numbered', variantId: 'E1', price: 18_000, editionSize: 50 },
  { slug: 'the-great-wave-numbered', variantId: 'E2', price: 18_000, editionSize: 50 },
];

const SHIPPING = [
  { id: 'S1', code: 'standard-shipping', price: 1200 },
  { id: 'S2', code: 'numbered-copy-shipping', price: 0 },
] as const;

export const COUNTRIES = [
  { code: 'US', name: 'United States of America' },
  { code: 'BR', name: 'Brazil' },
];

interface Variant {
  readonly id: string;
  readonly sku: string;
  readonly price: number;
  readonly paperSize: string | null;
  readonly editionSize: number | null;
  readonly productSlug: string;
}

interface Line {
  readonly id: string;
  readonly variant: Variant;
  quantity: number;
}

interface Order {
  readonly id: string;
  readonly code: string;
  state: 'AddingItems' | 'ArrangingPayment' | 'PaymentSettled';
  lines: Line[];
  customerEmail: string | null;
  address: Record<string, string | null> | null;
  shipping: (typeof SHIPPING)[number] | null;
  customFields: { copyNumber: number | null; receiptEmail: string | null };
  placedAt: string | null;
}

interface Session {
  /** The Deckle user commerce signed in, or null for a guest. */
  readonly userId: string | null;
  active: Order | null;
}

export interface ShopAnswer {
  readonly status: number;
  readonly body: unknown;
  /** A new session's token, sent back in `vendure-auth-token`. */
  readonly token?: string;
}

/** The operations that act on a session's order, for which Vendure opens a session if needed. */
const IN_SESSION = new Set([
  'ActiveOrder',
  'OrderByCode',
  'AddItem',
  'AdjustLine',
  'RemoveLine',
  'SetCustomer',
  'SetShippingAddress',
  'SetOrderFields',
  'EligibleShipping',
  'SetShippingMethod',
  'Transition',
  'AddPayment',
]);

let sequence = 0;
const next = (prefix: string) => `${prefix}${String(++sequence)}`;

/**
 * The part of Vendure's Shop API that sells: sessions by bearer token, an
 * active order per guest session or per customer, the checkout's steps and the
 * test payment. Enough to tell whether the gateway asks for the right things in
 * the right order; Vendure itself is tested in commerce's integration suite.
 */
export class FakeShop {
  readonly sessions = new Map<string, Session>();
  readonly placed: Order[] = [];
  /** The next payment is declined, as `dummy` does when told to. */
  declinePayments = false;
  /** Commerce sold out of an edition behind the gateway's back. */
  soldOut = new Set<string>();
  private readonly customerOrders = new Map<string, Order>();

  private readonly variants = new Map<string, Variant>([
    ...fixtures.products.flatMap((product) =>
      product.variants.map((variant): [string, Variant] => [
        variant.id,
        {
          id: variant.id,
          sku: variant.sku,
          price: variant.priceWithTax,
          paperSize: variant.customFields.paperSize,
          editionSize: null,
          productSlug: product.slug,
        },
      ]),
    ),
    ...EDITIONS.map((edition): [string, Variant] => [
      edition.variantId,
      {
        id: edition.variantId,
        sku: `${edition.slug}-A3`,
        price: edition.price,
        paperSize: 'A3',
        editionSize: edition.editionSize,
        productSlug: edition.slug,
      },
    ]),
  ]);

  reset(): void {
    this.sessions.clear();
    this.placed.length = 0;
    this.declinePayments = false;
    this.soldOut.clear();
    this.customerOrders.clear();
  }

  /** Answers one Shop API operation, or null when it is not about orders. */
  answer(
    operationName: string,
    variables: Record<string, unknown>,
    authorization: string | undefined,
  ): ShopAnswer | null {
    const bearer = /^Bearer (.+)$/.exec(authorization ?? '')?.[1];
    const known = bearer === undefined ? undefined : this.sessions.get(bearer);
    switch (operationName) {
      case 'AvailableCountries':
        return ok({ availableCountries: COUNTRIES });
      case 'Editions': {
        const slugs = (variables['options'] as { filter: { slug: { in: string[] } } }).filter.slug
          .in;
        return ok({
          products: {
            items: EDITIONS.filter((edition) => slugs.includes(edition.slug)).map((edition) => ({
              slug: edition.slug,
              variants: [
                {
                  id: edition.variantId,
                  priceWithTax: edition.price,
                  currencyCode: 'USD',
                  customFields: { editionSize: edition.editionSize },
                },
              ],
            })),
          },
        });
      }
      case 'Authenticate': {
        const { sub } = decodeJwt(String(variables['token']));
        if (sub === undefined) return ok({ authenticate: refusal('INVALID_CREDENTIALS_ERROR') });
        const token = randomUUID();
        this.sessions.set(token, { userId: sub, active: null });
        return { ...ok({ authenticate: { __typename: 'CurrentUser', id: `U-${sub}` } }), token };
      }
      case 'LogOut':
        if (bearer !== undefined) this.sessions.delete(bearer);
        return ok({ logout: { success: true } });
      default:
        break;
    }

    if (!IN_SESSION.has(operationName)) return null;
    // What needs a session: Vendure opens a guest one when none, or a lapsed one, is sent.
    let token: string | undefined;
    let session = known;
    if (session === undefined) {
      token = randomUUID();
      session = { userId: null, active: null };
      this.sessions.set(token, session);
    }
    const answer = this.inSession(session, operationName, variables);
    return answer === null ? null : { ...answer, ...(token === undefined ? {} : { token }) };
  }

  private inSession(
    session: Session,
    operationName: string,
    variables: Record<string, unknown>,
  ): ShopAnswer | null {
    const active = this.activeOf(session);
    switch (operationName) {
      case 'ActiveOrder':
        return ok({ activeOrder: active === null ? null : document(active) });
      case 'OrderByCode': {
        const code = String(variables['code']);
        const order = this.placed.find((each) => each.code === code);
        return ok({ orderByCode: order === undefined ? null : document(order) });
      }
      case 'AddItem': {
        const variant = this.variants.get(String(variables['variantId']));
        if (variant === undefined) return ok({ result: refusal('PRODUCT_VARIANT_NOT_FOUND') });
        const order = active ?? this.open(session);
        if (order.state !== 'AddingItems')
          return ok({ result: refusal('ORDER_MODIFICATION_ERROR') });
        if (this.soldOut.has(variant.id)) {
          return ok({ result: { ...refusal('INSUFFICIENT_STOCK_ERROR'), quantityAvailable: 0 } });
        }
        const line = order.lines.find((each) => each.variant.id === variant.id);
        const quantity = Number(variables['quantity']);
        if (line === undefined) order.lines.push({ id: next('L'), variant, quantity });
        else line.quantity += quantity;
        return changed(order);
      }
      case 'AdjustLine':
      case 'RemoveLine': {
        if (active === null) return ok({ result: refusal('NO_ACTIVE_ORDER_ERROR') });
        if (active.state !== 'AddingItems')
          return ok({ result: refusal('ORDER_MODIFICATION_ERROR') });
        const lineId = String(variables['lineId']);
        const quantity = operationName === 'RemoveLine' ? 0 : Number(variables['quantity']);
        active.lines = active.lines
          .map((line) => (line.id === lineId ? { ...line, quantity } : line))
          .filter((line) => line.quantity > 0);
        if (active.lines.length === 0) active.shipping = null;
        return changed(active);
      }
      case 'SetCustomer': {
        if (active === null) return ok({ result: refusal('NO_ACTIVE_ORDER_ERROR') });
        if (session.userId !== null) return ok({ result: refusal('ALREADY_LOGGED_IN_ERROR') });
        active.customerEmail = (variables['input'] as { emailAddress: string }).emailAddress;
        return changed(active);
      }
      case 'SetShippingAddress': {
        if (active === null) return ok({ result: refusal('NO_ACTIVE_ORDER_ERROR') });
        const input = variables['input'] as Record<string, string | null>;
        const country = COUNTRIES.find((each) => each.code === input['countryCode']);
        active.address = { ...input, country: country?.name ?? null };
        return changed(active);
      }
      case 'SetOrderFields': {
        if (active === null) return ok({ result: refusal('NO_ACTIVE_ORDER_ERROR') });
        const { customFields } = variables['input'] as {
          customFields: { copyNumber: number; receiptEmail: string };
        };
        active.customFields = customFields;
        return changed(active);
      }
      case 'EligibleShipping':
        return ok({
          eligibleShippingMethods:
            active === null ? [] : eligible(active).map(({ id, code }) => ({ id, code })),
        });
      case 'SetShippingMethod': {
        if (active === null) return ok({ result: refusal('NO_ACTIVE_ORDER_ERROR') });
        const [id] = variables['ids'] as string[];
        const method = eligible(active).find((each) => each.id === id);
        if (method === undefined)
          return ok({ result: refusal('INELIGIBLE_SHIPPING_METHOD_ERROR') });
        active.shipping = method;
        return changed(active);
      }
      case 'Transition': {
        if (active === null) return ok({ result: null });
        const state = String(variables['state']);
        const ready =
          state === 'AddingItems'
            ? active.state === 'ArrangingPayment'
            : active.state === 'AddingItems' &&
              active.address !== null &&
              active.shipping !== null &&
              (session.userId !== null || active.customerEmail !== null);
        if (!ready) return ok({ result: refusal('ORDER_STATE_TRANSITION_ERROR') });
        active.state = state as Order['state'];
        return changed(active);
      }
      case 'AddPayment': {
        if (active?.state !== 'ArrangingPayment') {
          return ok({ result: refusal('ORDER_PAYMENT_STATE_ERROR') });
        }
        if (this.declinePayments) return ok({ result: refusal('PAYMENT_DECLINED_ERROR') });
        active.state = 'PaymentSettled';
        active.placedAt = new Date().toISOString();
        this.placed.push(active);
        this.close(session);
        return changed(active);
      }
      default:
        return null;
    }
  }

  /** A guest's order lives in their session; a customer's follows them to any session. */
  private activeOf(session: Session): Order | null {
    return session.userId === null
      ? session.active
      : (this.customerOrders.get(session.userId) ?? null);
  }

  private open(session: Session): Order {
    const order: Order = {
      id: next('O'),
      code: next('DK').toUpperCase().padEnd(8, 'Q'),
      state: 'AddingItems',
      lines: [],
      customerEmail: session.userId === null ? null : `${session.userId}@users.deckle.invalid`,
      address: null,
      shipping: null,
      customFields: { copyNumber: null, receiptEmail: null },
      placedAt: null,
    };
    if (session.userId === null) session.active = order;
    else this.customerOrders.set(session.userId, order);
    return order;
  }

  private close(session: Session) {
    if (session.userId === null) session.active = null;
    else this.customerOrders.delete(session.userId);
  }
}

const ok = (data: unknown): ShopAnswer => ({ status: 200, body: { data } });

const refusal = (errorCode: string) => ({
  __typename: errorCode
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(''),
  errorCode,
  message: `The fake shop answered ${errorCode}`,
});

const changed = (order: Order): ShopAnswer =>
  ok({ result: { __typename: 'Order', ...document(order) } });

function eligible(order: Order) {
  const numbered =
    order.lines.length > 0 && order.lines.every((line) => line.variant.editionSize !== null);
  return SHIPPING.filter((method) => method.code === 'standard-shipping' || numbered);
}

function document(order: Order) {
  const subTotal = order.lines.reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
  const shipping = order.shipping?.price ?? 0;
  return {
    id: order.id,
    code: order.code,
    state: order.state,
    active: order.placedAt === null,
    orderPlacedAt: order.placedAt,
    currencyCode: 'USD',
    totalQuantity: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    subTotalWithTax: subTotal,
    shippingWithTax: shipping,
    totalWithTax: subTotal + shipping,
    customFields: order.customFields,
    customer: order.customerEmail === null ? null : { emailAddress: order.customerEmail },
    shippingAddress:
      order.address === null
        ? null
        : {
            fullName: order.address['fullName'] ?? null,
            streetLine1: order.address['streetLine1'] ?? null,
            streetLine2: order.address['streetLine2'] ?? null,
            city: order.address['city'] ?? null,
            postalCode: order.address['postalCode'] ?? null,
            countryCode: order.address['countryCode'] ?? null,
            country: order.address['country'] ?? null,
          },
    shippingLines:
      order.shipping === null
        ? []
        : [{ priceWithTax: order.shipping.price, shippingMethod: { code: order.shipping.code } }],
    lines: order.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      unitPriceWithTax: line.variant.price,
      linePriceWithTax: line.variant.price * line.quantity,
      productVariant: {
        id: line.variant.id,
        sku: line.variant.sku,
        customFields: { paperSize: line.variant.paperSize, editionSize: line.variant.editionSize },
        product: { slug: line.variant.productSlug },
      },
    })),
  };
}
