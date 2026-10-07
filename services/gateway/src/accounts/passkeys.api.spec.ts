import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Browser } from '../../test/support/browser.js';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { errorCodes } from '../../test/support/graphql.js';
import { SoftAuthenticator } from '../../test/support/soft-authenticator.js';
import {
  createTestApp,
  PUBLIC_ORIGIN,
  type TestApp,
  testEnv,
} from '../../test/support/test-app.js';

const START_REGISTRATION = 'mutation { startPasskeyRegistration }';
const FINISH_REGISTRATION = /* GraphQL */ `
  mutation Finish($response: String!) {
    finishPasskeyRegistration(response: $response) {
      id
      since
    }
  }
`;
const START_SIGN_IN = 'mutation { startPasskeySignIn }';
const FINISH_SIGN_IN = /* GraphQL */ `
  mutation Finish($response: String!) {
    finishPasskeySignIn(response: $response) {
      id
    }
  }
`;
const VIEWER = '{ viewer { id } }';
const ADD = /* GraphQL */ `
  mutation {
    addToCart(artwork: "melencolia-i", size: A3) {
      quantity
    }
  }
`;

describe('passkeys over GraphQL', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;
  let device: SoftAuthenticator;

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
    gateway.accounts.accounts.clear();
    gateway.accounts.passkeys.clear();
    gateway.accounts.ceremonies.clear();
    device = new SoftAuthenticator(PUBLIC_ORIGIN);
  });

  /** Makes a passkey on `device` from `browser`, and returns the new account's id. */
  async function makePasskey(browser: Browser): Promise<string> {
    const options = await browser.graphql<{ startPasskeyRegistration: string }>(START_REGISTRATION);
    const response = device.register(options.data?.startPasskeyRegistration ?? '');
    const finished = await browser.graphql<{ finishPasskeyRegistration: { id: string } }>(
      FINISH_REGISTRATION,
      { response },
    );
    expect(finished.errors).toBeUndefined();
    return finished.data?.finishPasskeyRegistration.id ?? '';
  }

  async function signIn(browser: Browser) {
    const options = await browser.graphql<{ startPasskeySignIn: string }>(START_SIGN_IN);
    const response = device.signIn(options.data?.startPasskeySignIn ?? '');
    return {
      response,
      answer: await browser.graphql<{ finishPasskeySignIn: { id: string } }>(FINISH_SIGN_IN, {
        response,
      }),
    };
  }

  it('asks the device for a discoverable passkey, verified by its owner, on this origin', async () => {
    const browser = new Browser(gateway);
    const { data } = await browser.graphql<{ startPasskeyRegistration: string }>(
      START_REGISTRATION,
    );
    const options = JSON.parse(data?.startPasskeyRegistration ?? '{}') as Record<string, unknown>;

    expect(options).toMatchObject({
      rp: { name: 'Deckle', id: 'localhost' },
      attestation: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });
    expect((options['user'] as { name: string }).name).toMatch(/^Deckle collector [0-9A-F]{4}$/);
  });

  it('makes an account with a passkey, signs it in, and changes the session as it does', async () => {
    const browser = new Browser(gateway);
    await browser.graphql(ADD);
    const guestCookie = browser.session;

    const id = await makePasskey(browser);

    expect(browser.session).not.toBe(guestCookie);
    expect((await browser.graphql<{ viewer: { id: string } }>(VIEWER)).data?.viewer.id).toBe(id);
    expect(gateway.accounts.accounts.has(id)).toBe(true);
    // The cart was the browser's, and stays with it.
    const cart = await browser.graphql<{ cart: { quantity: number } }>('{ cart { quantity } }');
    expect(cart.data?.cart.quantity).toBe(1);
    // The guest session's id opens nothing any more.
    const before = new Browser(gateway);
    before.holdCookie(guestCookie);
    expect((await before.graphql<{ viewer: null }>(VIEWER)).data?.viewer).toBeNull();
  });

  it('signs the same account in on another browser, with the passkey the device keeps', async () => {
    const id = await makePasskey(new Browser(gateway));
    const elsewhere = new Browser(gateway);

    const { answer } = await signIn(elsewhere);

    expect(answer.data?.finishPasskeySignIn.id).toBe(id);
    expect((await elsewhere.graphql<{ viewer: { id: string } }>(VIEWER)).data?.viewer.id).toBe(id);
    const [passkey] = [...gateway.accounts.passkeys.values()];
    expect(passkey?.counter).toBe(1);
    expect(passkey?.lastUsedAt).not.toBeNull();
  });

  it('answers each challenge once', async () => {
    await makePasskey(new Browser(gateway));
    const browser = new Browser(gateway);
    const { response } = await signIn(browser);

    const replayed = await browser.graphql(FINISH_SIGN_IN, { response });

    expect(errorCodes(replayed)).toEqual(['NO_CEREMONY']);
  });

  it('turns away an answer to a question this browser never asked', async () => {
    const response = await new Browser(gateway).graphql(FINISH_SIGN_IN, { response: '{}' });
    expect(errorCodes(response)).toEqual(['BAD_USER_INPUT']);

    await makePasskey(new Browser(gateway));
    const options = await new Browser(gateway).graphql<{ startPasskeySignIn: string }>(
      START_SIGN_IN,
    );
    const stranger = new Browser(gateway);
    const answer = await stranger.graphql(FINISH_SIGN_IN, {
      response: device.signIn(options.data?.startPasskeySignIn ?? ''),
    });
    expect(errorCodes(answer)).toEqual(['NO_CEREMONY']);
  });

  it('refuses a passkey made for no account here, or for another site', async () => {
    const browser = new Browser(gateway);
    const options = await browser.graphql<{ startPasskeyRegistration: string }>(START_REGISTRATION);
    // Made, but never finished: the gateway has no account for it.
    device.register(options.data?.startPasskeyRegistration ?? '');
    expect(errorCodes((await signIn(browser)).answer)).toEqual(['PASSKEY_REJECTED']);

    const phishing = new SoftAuthenticator('https://deckle.example');
    const asked = await browser.graphql<{ startPasskeyRegistration: string }>(START_REGISTRATION);
    const answer = await browser.graphql(FINISH_REGISTRATION, {
      response: phishing.register(asked.data?.startPasskeyRegistration ?? ''),
    });
    expect(errorCodes(answer)).toEqual(['PASSKEY_REJECTED']);
    expect(gateway.accounts.accounts.size).toBe(0);
  });

  it('refuses what is not a passkey answer at all', async () => {
    const browser = new Browser(gateway);
    await browser.graphql(START_REGISTRATION);
    for (const response of [
      'not json',
      '{"id":"x"}',
      JSON.stringify({ id: '!', type: 'public-key' }),
    ]) {
      expect(errorCodes(await browser.graphql(FINISH_REGISTRATION, { response }))).toEqual([
        'BAD_USER_INPUT',
      ]);
    }
    const tooLong = await browser.graphql(FINISH_REGISTRATION, { response: 'x'.repeat(40_000) });
    expect(errorCodes(tooLong)).toEqual(['BAD_USER_INPUT']);
  });

  it('signs out, keeping the cart, and forgetting the signed-in session', async () => {
    const browser = new Browser(gateway);
    await browser.graphql(ADD);
    await makePasskey(browser);
    const signedIn = browser.session;

    const out = await browser.graphql<{ signOut: boolean }>('mutation { signOut }');

    expect(out.data?.signOut).toBe(true);
    expect((await browser.graphql<{ viewer: null }>(VIEWER)).data?.viewer).toBeNull();
    const cart = await browser.graphql<{ cart: { quantity: number } }>('{ cart { quantity } }');
    expect(cart.data?.cart.quantity).toBe(1);
    const stale = new Browser(gateway);
    stale.holdCookie(signedIn);
    expect((await stale.graphql<{ viewer: null }>(VIEWER)).data?.viewer).toBeNull();
    // A guest signing out changes nothing.
    expect((await new Browser(gateway).graphql('mutation { signOut }')).data).toEqual({
      signOut: true,
    });
  });

  it('forgets a cookie it does not know, and one that is not its shape', async () => {
    for (const cookie of ['A'.repeat(43), 'short']) {
      const browser = new Browser(gateway);
      browser.holdCookie(cookie);
      await browser.graphql(VIEWER);
      expect(browser.session).toBeNull();
    }
  });
});
