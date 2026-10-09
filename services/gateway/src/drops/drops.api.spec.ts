import { createHash } from 'node:crypto';
import type { Client } from 'graphql-ws';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Browser } from '../../test/support/browser.js';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { errorCodes, graphql } from '../../test/support/graphql.js';
import { SoftAuthenticator } from '../../test/support/soft-authenticator.js';
import { subscriptionClient } from '../../test/support/subscriptions.js';
import {
  createTestApp,
  PUBLIC_ORIGIN,
  type TestApp,
  testEnv,
} from '../../test/support/test-app.js';

const MELENCOLIA = 'melencolia-i-numbered';
const WAVE = 'the-great-wave-numbered';

const DROPS = /* GraphQL */ `
  {
    drops {
      slug
      artworkSlug
      editionSize
      opensAt
      artwork {
        title
      }
      page {
        headline
        blocks {
          __typename
        }
      }
      price {
        amount
        currencyCode
      }
      paperSize
      stock {
        open
        held
        sold
      }
    }
  }
`;

const DROP = /* GraphQL */ `
  query Drop($slug: String!) {
    drop(slug: $slug) {
      stock {
        open
        held
        sold
        copies
      }
      viewerCopy {
        number
        state
      }
    }
  }
`;

const CLAIM = /* GraphQL */ `
  mutation Claim($drop: String!) {
    claimCopy(drop: $drop) {
      drop
      number
      state
      heldUntil
      secondsLeft
      orderCode
    }
  }
`;

const RELEASE = 'mutation Release($drop: String!) { releaseCopy(drop: $drop) }';

const PAY = /* GraphQL */ `
  mutation Pay($drop: String!, $input: CheckoutInput!) {
    payForCopy(drop: $drop, input: $input) {
      code
      email
      shipping {
        amount
      }
      total {
        amount
      }
      lines {
        artworkSlug
        drop
        copyNumber
        editionSize
        size
        artwork {
          title
        }
      }
    }
  }
`;

const COPIES = '{ viewer { copies { drop number state orderCode secondsLeft } } }';

const STOCK_CHANGED = /* GraphQL */ `
  subscription Stock($drop: String!) {
    dropStockChanged(drop: $drop) {
      open
      held
      sold
    }
  }
`;

const ana = {
  email: 'ana@example.com',
  fullName: 'Ana Souza',
  streetLine1: '1000 Fifth Avenue',
  city: 'New York',
  postalCode: '10028',
  countryCode: 'US',
};

interface Claimed {
  number: number;
  state: string;
  secondsLeft: number | null;
}

describe('drops over GraphQL', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;
  let client: Client | undefined;

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
    gateway.drops.records.clear();
    gateway.drops.copies.clear();
    // As the gateway records them on its first start: one open now, one in eight days.
    void gateway.drops.record([
      {
        slug: MELENCOLIA,
        artworkSlug: 'melencolia-i',
        editionSize: 50,
        opensAt: new Date(Date.now() - 60_000),
      },
      {
        slug: WAVE,
        artworkSlug: 'under-the-wave-off-kanagawa',
        editionSize: 50,
        opensAt: new Date(Date.now() + 8 * 24 * 60 * 60_000),
      },
    ]);
  });

  afterEach(async () => {
    await client?.dispose();
    client = undefined;
  });

  /** A browser signed in with a passkey of its own. */
  async function collector(): Promise<Browser> {
    const browser = new Browser(gateway);
    const device = new SoftAuthenticator(PUBLIC_ORIGIN);
    const options = await browser.graphql<{ startPasskeyRegistration: string }>(
      'mutation { startPasskeyRegistration }',
    );
    const finished = await browser.graphql(
      'mutation Finish($response: String!) { finishPasskeyRegistration(response: $response) { id } }',
      { response: device.register(options.data?.startPasskeyRegistration ?? '') },
    );
    expect(finished.errors).toBeUndefined();
    return browser;
  }

  const claim = (browser: Browser, drop = MELENCOLIA) =>
    browser.graphql<{ claimCopy: Claimed }>(CLAIM, { drop });

  /** The account a browser is signed in to, read from its session. */
  const userOf = (browser: Browser) =>
    gateway.sessions.sessions.get(
      createHash('sha256')
        .update(browser.session ?? '')
        .digest('base64url'),
    )?.userId ?? '';

  it('lists the drops with their words, their price and their copies', async () => {
    const response = await new Browser(gateway).graphql(DROPS);

    expect(response.errors).toBeUndefined();
    expect(response.data).toMatchObject({
      drops: [
        {
          slug: MELENCOLIA,
          artworkSlug: 'melencolia-i',
          editionSize: 50,
          artwork: { title: 'Melencolia I' },
          page: {
            headline: 'Melencolia I, in fifty numbered copies',
            blocks: [{ __typename: 'ParagraphBlock' }],
          },
          price: { amount: 18_000, currencyCode: 'USD' },
          paperSize: 'A3',
          stock: { open: 50, held: 0, sold: 0 },
        },
        // Its page is still a draft in the CMS.
        { slug: WAVE, page: null, price: { amount: 18_000 } },
      ],
    });
    // One request each to the CMS and commerce for every drop's words and prices.
    expect(
      upstreams.requests.cms.filter((request) => request.path === '/api/drop-pages'),
    ).toHaveLength(1);
    expect(upstreams.commerceOperations().filter((name) => name === 'Editions')).toHaveLength(1);
  });

  it("reads a drop's words in Portuguese for a request that accepts it", async () => {
    const response = await graphql(gateway, '{ drops { slug page { headline } } }', undefined, {
      'Accept-Language': 'pt-BR',
    });

    expect(response.data).toMatchObject({
      drops: [
        { slug: MELENCOLIA, page: { headline: 'Melencolia I, em cinquenta exemplares numerados' } },
        { slug: WAVE, page: null },
      ],
    });
  });

  it('asks a guest to sign in first', async () => {
    expect(errorCodes(await claim(new Browser(gateway)))).toEqual(['UNAUTHENTICATED']);
    const pay = await new Browser(gateway).graphql(PAY, { drop: MELENCOLIA, input: ana });
    expect(errorCodes(pay)).toEqual(['UNAUTHENTICATED']);
  });

  it('holds the lowest open copy for ten minutes, by the database clock', async () => {
    const first = await collector();
    const second = await collector();

    const one = await claim(first);
    const two = await claim(second);

    expect(one.data?.claimCopy).toMatchObject({ number: 1, state: 'HELD', orderCode: null });
    expect(two.data?.claimCopy.number).toBe(2);
    expect(one.data?.claimCopy.secondsLeft).toBeGreaterThan(590);
    expect(one.data?.claimCopy.secondsLeft).toBeLessThanOrEqual(600);
    const { data } = await first.graphql<{
      drop: { stock: { held: number; copies: string[] }; viewerCopy: Claimed };
    }>(DROP, { slug: MELENCOLIA });
    expect(data?.drop.stock.held).toBe(2);
    expect(data?.drop.stock.copies.slice(0, 3)).toEqual(['HELD', 'HELD', 'OPEN']);
    expect(data?.drop.viewerCopy).toEqual({ number: 1, state: 'HELD' });
  });

  it('gives one copy per person, one hold at a time, and nothing before the drop opens', async () => {
    const browser = await collector();
    await claim(browser);

    expect(errorCodes(await claim(browser))).toEqual(['ALREADY_HAS_COPY']);
    expect(errorCodes(await claim(browser, WAVE))).toEqual(['DROP_NOT_OPEN']);
    const wave = gateway.drops.records.get(WAVE);
    if (wave !== undefined) {
      gateway.drops.records.set(WAVE, { ...wave, opensAt: new Date(Date.now() - 1000) });
    }
    expect(errorCodes(await claim(browser, WAVE))).toEqual(['HOLDING_ANOTHER']);
    expect(errorCodes(await claim(browser, 'no-such-drop'))).toEqual(['NO_SUCH_DROP']);
  });

  it('says so when every copy is held or sold', async () => {
    const records = gateway.drops.records.get(MELENCOLIA);
    if (records !== undefined) {
      gateway.drops.records.clear();
      gateway.drops.copies.clear();
      await gateway.drops.record([{ ...records, editionSize: 1 }]);
    }
    await claim(await collector());

    expect(errorCodes(await claim(await collector()))).toEqual(['NO_COPY_OPEN']);
  });

  it('gives a held copy back, and opens it again when its ten minutes run out', async () => {
    const browser = await collector();
    await claim(browser);

    expect((await browser.graphql(RELEASE, { drop: MELENCOLIA })).data).toEqual({
      releaseCopy: true,
    });
    expect((await browser.graphql(RELEASE, { drop: MELENCOLIA })).data).toEqual({
      releaseCopy: false,
    });

    const again = await claim(browser);
    expect(again.data?.claimCopy.number).toBe(1);
    gateway.drops.expire(MELENCOLIA, userOf(browser));
    const { data } = await browser.graphql<{ drop: { stock: { open: number } } }>(DROP, {
      slug: MELENCOLIA,
    });
    expect(data?.drop.stock.open).toBe(50);
    // The same person may claim again once their hold ran out.
    expect((await claim(browser)).data?.claimCopy.state).toBe('HELD');
  });

  it("sells the held copy to the account's customer, shipping included, and records the order", async () => {
    const browser = await collector();
    await claim(browser);

    const paid = await browser.graphql<{ payForCopy: { code: string } }>(PAY, {
      drop: MELENCOLIA,
      input: ana,
    });

    expect(paid.errors).toBeUndefined();
    expect(paid.data?.payForCopy).toMatchObject({
      email: 'ana@example.com',
      shipping: { amount: 0 },
      total: { amount: 18_000 },
      lines: [
        {
          artworkSlug: 'melencolia-i',
          drop: MELENCOLIA,
          copyNumber: 1,
          editionSize: 50,
          size: 'A3',
          artwork: { title: 'Melencolia I' },
        },
      ],
    });
    const code = paid.data?.payForCopy.code;
    const copies = await browser.graphql<{ viewer: { copies: unknown[] } }>(COPIES);
    expect(copies.data?.viewer.copies).toEqual([
      { drop: MELENCOLIA, number: 1, state: 'SOLD', orderCode: code, secondsLeft: null },
    ]);
    // Commerce knows the customer by the account, and the order by its copy and receipt.
    const [order] = upstreams.shop.placed;
    expect(order?.customFields).toEqual({
      receiptLanguage: 'en',
      copyNumber: 1,
      receiptEmail: 'ana@example.com',
    });
    expect(order?.customerEmail).toMatch(/@users\.deckle\.invalid$/);
    const customer = [...upstreams.shop.sessions.values()].find(
      (session) => session.userId !== null,
    );
    expect(customer?.userId).toBe(userOf(browser));

    expect(errorCodes(await browser.graphql(PAY, { drop: MELENCOLIA, input: ana }))).toEqual([
      'NO_HOLD',
    ]);
  });

  it('opens the customer’s session again when commerce has let it lapse', async () => {
    const browser = await collector();
    await claim(browser);
    upstreams.shop.declinePayments = true;
    await browser.graphql(PAY, { drop: MELENCOLIA, input: ana });
    upstreams.shop.declinePayments = false;
    upstreams.shop.sessions.clear();

    const paid = await browser.graphql(PAY, { drop: MELENCOLIA, input: ana });

    expect(paid.errors).toBeUndefined();
    expect(upstreams.commerceOperations().filter((name) => name === 'Authenticate')).toHaveLength(
      2,
    );
  });

  it('keeps the copy held when the payment fails, so it can be tried again', async () => {
    const browser = await collector();
    await claim(browser);
    upstreams.shop.declinePayments = true;

    expect(errorCodes(await browser.graphql(PAY, { drop: MELENCOLIA, input: ana }))).toEqual([
      'PAYMENT_FAILED',
    ]);
    const copies = await browser.graphql<{ viewer: { copies: { state: string }[] } }>(COPIES);
    expect(copies.data?.viewer.copies.map((copy) => copy.state)).toEqual(['HELD']);
  });

  it('turns away a payment for a hold that ran out, and checks the form first', async () => {
    const browser = await collector();
    await claim(browser);

    const wrong = await browser.graphql(PAY, { drop: MELENCOLIA, input: { ...ana, email: 'x' } });
    expect(errorCodes(wrong)).toEqual(['BAD_USER_INPUT']);

    gateway.drops.expire(MELENCOLIA, userOf(browser));
    expect(errorCodes(await browser.graphql(PAY, { drop: MELENCOLIA, input: ana }))).toEqual([
      'NO_HOLD',
    ]);
  });

  it('logs and refuses a copy commerce has no stock for: the second barrier', async () => {
    const browser = await collector();
    await claim(browser);
    upstreams.shop.soldOut.add('E1');

    const response = await browser.graphql(PAY, { drop: MELENCOLIA, input: ana });

    expect(errorCodes(response)).toEqual(['INTERNAL_SERVER_ERROR']);
    const copies = await browser.graphql<{ viewer: { copies: { state: string }[] } }>(COPIES);
    expect(copies.data?.viewer.copies.map((copy) => copy.state)).toEqual(['HELD']);
  });

  it('signs the customer out of commerce too, and out of Deckle even when commerce is down', async () => {
    const browser = await collector();
    await claim(browser);
    await browser.graphql(PAY, { drop: MELENCOLIA, input: ana });

    await browser.graphql('mutation { signOut }');
    expect(upstreams.commerceOperations()).toContain('LogOut');

    const other = await collector();
    await claim(other);
    await other.graphql(PAY, { drop: MELENCOLIA, input: ana });
    upstreams.modes.commerce = 'unavailable';
    expect((await other.graphql('mutation { signOut }')).data).toEqual({ signOut: true });
  });

  it('turns away a payment for a drop commerce sells no edition of', async () => {
    await gateway.drops.record([
      { slug: 'a-test-drop', artworkSlug: 'melencolia-i', editionSize: 5, opensAt: new Date(0) },
    ]);
    const browser = await collector();
    await claim(browser, 'a-test-drop');

    const response = await browser.graphql(PAY, { drop: 'a-test-drop', input: ana });

    expect(errorCodes(response)).toEqual(['NO_SUCH_DROP']);
  });

  it("clears what an abandoned payment left in the customer's order before the next copy", async () => {
    const browser = await collector();
    await claim(browser);
    upstreams.shop.declinePayments = true;
    await browser.graphql(PAY, { drop: MELENCOLIA, input: ana });
    upstreams.shop.declinePayments = false;
    await browser.graphql(RELEASE, { drop: MELENCOLIA });
    const wave = gateway.drops.records.get(WAVE);
    if (wave !== undefined) {
      gateway.drops.records.set(WAVE, { ...wave, opensAt: new Date(Date.now() - 1000) });
    }
    await claim(browser, WAVE);

    const paid = await browser.graphql<{ payForCopy: { lines: { drop: string }[] } }>(PAY, {
      drop: WAVE,
      input: ana,
    });

    expect(paid.errors).toBeUndefined();
    expect(paid.data?.payForCopy.lines.map((line) => line.drop)).toEqual([WAVE]);
  });

  it('tells every watcher how the copies stand, once per burst of claims', async () => {
    client = subscriptionClient(gateway.url);
    const changes = client.iterate({ query: STOCK_CHANGED, variables: { drop: MELENCOLIA } });
    const first = changes.next();
    await vi.waitFor(() => {
      expect(gateway.pubSub.subscribers).toBeGreaterThan(0);
    });

    const [one, two] = [await collector(), await collector()];
    await claim(one);
    await claim(two);

    const event = await first;
    expect(event.value).toMatchObject({
      data: { dropStockChanged: { open: 48, held: 2, sold: 0 } },
    });
  });
});
