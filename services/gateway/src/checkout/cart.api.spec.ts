import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser } from '../../test/support/browser.js';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { errorCodes } from '../../test/support/graphql.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';

const CART = /* GraphQL */ `
  fragment CartView on Cart {
    quantity
    subtotal {
      amount
    }
    shipping {
      amount
    }
    total {
      amount
      currencyCode
    }
    lines {
      id
      artworkSlug
      size
      quantity
      unitPrice {
        amount
      }
      price {
        amount
      }
      copyNumber
      artwork {
        title
      }
    }
  }
`;

const ADD = /* GraphQL */ `
  mutation Add($artwork: String!, $size: PaperSize!, $quantity: Int) {
    addToCart(artwork: $artwork, size: $size, quantity: $quantity) {
      ...CartView
    }
  }
  ${CART}
`;

const READ = /* GraphQL */ `
  query Read {
    cart {
      ...CartView
    }
  }
  ${CART}
`;

const SET_QUANTITY = /* GraphQL */ `
  mutation SetQuantity($line: ID!, $quantity: Int!) {
    setCartLineQuantity(line: $line, quantity: $quantity) {
      ...CartView
    }
  }
  ${CART}
`;

const PLACE = /* GraphQL */ `
  mutation Place($input: CheckoutInput!) {
    placeOrder(input: $input) {
      code
      email
      placedAt
      subtotal {
        amount
      }
      shipping {
        amount
      }
      total {
        amount
      }
      shipTo {
        fullName
        streetLine2
        city
        country
        countryCode
      }
      lines {
        artworkSlug
        size
        quantity
      }
    }
  }
`;

const ORDER = /* GraphQL */ `
  query Order($code: String!) {
    order(code: $code) {
      code
      total {
        amount
      }
    }
  }
`;

const ana = {
  email: 'ana@example.com',
  fullName: 'Ana Maria Souza',
  streetLine1: '1000 Fifth Avenue',
  streetLine2: '',
  city: 'New York',
  postalCode: '10028',
  countryCode: 'us',
};

interface CartView {
  quantity: number;
  subtotal: { amount: number } | null;
  shipping: { amount: number } | null;
  total: { amount: number; currencyCode: string } | null;
  lines: {
    id: string;
    artworkSlug: string;
    size: string;
    quantity: number;
    unitPrice: { amount: number };
    price: { amount: number };
    copyNumber: number | null;
    artwork: { title: string } | null;
  }[];
}

describe('the cart over GraphQL', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;
  let browser: Browser;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: testEnv(upstreams) });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  beforeEach(() => {
    upstreams.reset();
    gateway.sessions.sessions.clear();
    browser = new Browser(gateway);
  });

  const add = async (artwork = 'melencolia-i', size = 'A3', quantity = 1) =>
    browser.graphql<{ addToCart: CartView }>(ADD, { artwork, size, quantity });

  it('keeps no session, and asks commerce nothing, until something is added', async () => {
    const response = await browser.graphql<{ cart: CartView }>(READ);

    expect(response.data?.cart).toEqual({
      quantity: 0,
      subtotal: null,
      shipping: null,
      total: null,
      lines: [],
    });
    expect(browser.session).toBeNull();
    expect(gateway.sessions.sessions.size).toBe(0);
    expect(upstreams.commerceOperations()).toEqual([]);
  });

  it('starts the cart on the first print, behind an httpOnly cookie, with the flat rate', async () => {
    const response = await add();

    expect(response.data?.addToCart).toMatchObject({
      quantity: 1,
      subtotal: { amount: 9000 },
      shipping: { amount: 1200 },
      total: { amount: 10_200, currencyCode: 'USD' },
      lines: [
        {
          artworkSlug: 'melencolia-i',
          size: 'A3',
          quantity: 1,
          unitPrice: { amount: 9000 },
          copyNumber: null,
          artwork: { title: 'Melencolia I' },
        },
      ],
    });
    const [cookie] = browser.lastSetCookies;
    expect(cookie?.attributes.has('httponly')).toBe(true);
    expect(cookie?.attributes.get('samesite')).toBe('Lax');
    expect(cookie?.attributes.get('path')).toBe('/');
    // Over plain http the cookie cannot be Secure, so it cannot take the __Host- prefix.
    expect(cookie?.attributes.has('secure')).toBe(false);

    // The database keeps the secret's hash, never the secret; commerce's token stays server side.
    const [session] = [...gateway.sessions.sessions.values()];
    const secret = browser.session ?? '';
    expect(session?.id).toBe(createHash('sha256').update(secret).digest('base64url'));
    expect(session?.cartToken).toBe([...upstreams.shop.sessions.keys()][0]);
    expect(JSON.stringify(response.data)).not.toContain(session?.cartToken ?? 'no token');
  });

  it('adds to the same cart, and reads it back', async () => {
    await add();
    await add('under-the-wave-off-kanagawa', 'A4', 2);
    await add();

    const { data } = await browser.graphql<{ cart: CartView }>(READ);

    expect(data?.cart.quantity).toBe(4);
    expect(data?.cart.lines.map((line) => [line.artworkSlug, line.size, line.quantity])).toEqual([
      ['melencolia-i', 'A3', 2],
      ['under-the-wave-off-kanagawa', 'A4', 2],
    ]);
    expect(data?.cart.total?.amount).toBe(2 * 9000 + 2 * 5500 + 1200);
    expect(gateway.sessions.sessions.size).toBe(1);
  });

  it('changes how many of a line, and takes it away at none', async () => {
    const added = await add();
    const line = added.data?.addToCart.lines[0]?.id ?? '';

    const three = await browser.graphql<{ setCartLineQuantity: CartView }>(SET_QUANTITY, {
      line,
      quantity: 3,
    });
    expect(three.data?.setCartLineQuantity).toMatchObject({
      quantity: 3,
      subtotal: { amount: 27_000 },
    });

    const none = await browser.graphql<{ setCartLineQuantity: CartView }>(SET_QUANTITY, {
      line,
      quantity: 0,
    });
    expect(none.data?.setCartLineQuantity).toMatchObject({ quantity: 0, lines: [], total: null });

    const gone = await browser.graphql(SET_QUANTITY, { line, quantity: 1 });
    expect(errorCodes(gone)).toEqual(['NO_SUCH_LINE']);
  });

  it('refuses what commerce does not sell, and quantities past the limit', async () => {
    expect(errorCodes(await add('the-rhinoceros', 'A3'))).toEqual(['NOT_FOR_SALE']);
    expect(errorCodes(await add('no-such-work', 'A4'))).toEqual(['NOT_FOR_SALE']);
    expect(errorCodes(await add('melencolia-i', 'A3', 11))).toEqual(['BAD_USER_INPUT']);
    const strange = await browser.graphql(SET_QUANTITY, { line: 'L1', quantity: 1 });
    expect(errorCodes(strange)).toEqual(['NO_SUCH_LINE']);
  });

  it('places the cart as a guest, and shows the order to the browser that placed it', async () => {
    await add();
    await add('under-the-wave-off-kanagawa', 'A4');

    const placed = await browser.graphql<{
      placeOrder: { code: string; email: string; shipTo: Record<string, unknown> };
    }>(PLACE, { input: ana });

    expect(placed.errors).toBeUndefined();
    expect(placed.data?.placeOrder).toMatchObject({
      email: 'ana@example.com',
      subtotal: { amount: 14_500 },
      shipping: { amount: 1200 },
      total: { amount: 15_700 },
      shipTo: {
        fullName: 'Ana Maria Souza',
        streetLine2: null,
        city: 'New York',
        country: 'United States of America',
        countryCode: 'US',
      },
      lines: [
        { artworkSlug: 'melencolia-i', size: 'A3', quantity: 1 },
        { artworkSlug: 'under-the-wave-off-kanagawa', size: 'A4', quantity: 1 },
      ],
    });
    const code = placed.data?.placeOrder.code ?? '';
    const [order] = upstreams.shop.placed;
    expect(order?.customerEmail).toBe('ana@example.com');

    expect((await browser.graphql<{ cart: CartView }>(READ)).data?.cart.lines).toEqual([]);
    const mine = await browser.graphql<{ order: { code: string } | null }>(ORDER, { code });
    expect(mine.data?.order?.code).toBe(code);
    const someoneElse = await new Browser(gateway).graphql<{ order: null }>(ORDER, { code });
    expect(someoneElse.data?.order).toBeNull();
  });

  it('names every field of the form that is wrong, and asks commerce nothing', async () => {
    await add();
    const before = upstreams.commerceOperations().length;

    const response = await browser.graphql(PLACE, {
      input: { ...ana, email: 'not an email', city: '  ', countryCode: 'USA' },
    });

    expect(errorCodes(response)).toEqual(['BAD_USER_INPUT']);
    expect(response.errors?.[0]?.extensions?.['fields']).toEqual(['email', 'city', 'countryCode']);
    expect(upstreams.commerceOperations()).toHaveLength(before);
  });

  it('says when there is nothing to check out', async () => {
    expect(errorCodes(await browser.graphql(PLACE, { input: ana }))).toEqual(['CART_EMPTY']);
    const added = await add();
    await browser.graphql(SET_QUANTITY, { line: added.data?.addToCart.lines[0]?.id, quantity: 0 });
    expect(errorCodes(await browser.graphql(PLACE, { input: ana }))).toEqual(['CART_EMPTY']);
  });

  it('lets a declined payment be tried again, and the cart change in between', async () => {
    await add();
    upstreams.shop.declinePayments = true;

    expect(errorCodes(await browser.graphql(PLACE, { input: ana }))).toEqual(['PAYMENT_FAILED']);

    // The order waits for payment; a change brings it back to the cart first.
    upstreams.shop.declinePayments = false;
    const changed = await add('under-the-wave-off-kanagawa', 'A3');
    expect(changed.data?.addToCart.quantity).toBe(2);
    const placed = await browser.graphql<{ placeOrder: { total: { amount: number } } }>(PLACE, {
      input: ana,
    });
    expect(placed.data?.placeOrder.total.amount).toBe(9000 + 9000 + 1200);
  });

  it('starts over when commerce has let the cart’s session lapse', async () => {
    await add();
    upstreams.shop.sessions.clear();

    const { data } = await browser.graphql<{ cart: CartView }>(READ);

    expect(data?.cart.lines).toEqual([]);
    const [session] = [...gateway.sessions.sessions.values()];
    expect(session?.cartToken).toBe([...upstreams.shop.sessions.keys()][0]);
  });

  it('lists the countries the shop ships to', async () => {
    const response = await browser.graphql('{ countries { code name } }');
    expect(response.data).toEqual({
      countries: [
        { code: 'US', name: 'United States of America' },
        { code: 'BR', name: 'Brazil' },
      ],
    });
  });

  it('turns away an order code that is not one', async () => {
    const response = await browser.graphql(ORDER, { code: 'dk-1; drop table' });
    expect(errorCodes(response)).toEqual(['BAD_USER_INPUT']);
  });
});
