import type { IncomingMessage } from 'node:http';
import type { ConfigService } from '@nestjs/config';
import type { HttpAdapterHost } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { InMemorySessionStore } from '../../test/support/in-memory-accounts.js';
import type { Env } from '../config/env.js';
import { SESSION_LIFETIME_MS, Sessions } from './sessions.service.js';

function setUp(publicOrigin = 'http://localhost:8080') {
  const store = new InMemorySessionStore();
  const adapter = { setCookie: vi.fn(), clearCookie: vi.fn() };
  const config = { get: () => publicOrigin } as unknown as ConfigService<Env, true>;
  const sessions = new Sessions(
    store,
    { httpAdapter: adapter } as unknown as HttpAdapterHost,
    config,
  );
  const request = (cookie?: string) =>
    ({ headers: cookie === undefined ? {} : { cookie } }) as IncomingMessage;
  return { store, adapter, sessions, request };
}

describe('Sessions', () => {
  it('names the cookie for the origin: __Host- only where it can be Secure', () => {
    expect(setUp().sessions.cookieName).toBe('deckle_session');
    expect(setUp('https://deckle.example').sessions.cookieName).toBe('__Host-deckle_session');
  });

  it('makes one session per request however many resolvers ask for it', async () => {
    const { store, adapter, sessions, request } = setUp();
    const session = sessions.forHttp(request(), {});

    const [one, two] = await Promise.all([session.ensure(), session.ensure()]);

    expect(one).toBe(two);
    expect(store.sessions.size).toBe(1);
    expect(adapter.setCookie).toHaveBeenCalledTimes(1);
    expect(adapter.setCookie).toHaveBeenCalledWith(
      {},
      'deckle_session',
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: SESSION_LIFETIME_MS / 1000,
      }),
    );
  });

  it('pushes a session back once a day, and sends the cookie again when it does', async () => {
    const { store, adapter, sessions, request } = setUp();
    await sessions.forHttp(request(), {}).ensure();
    const secret = String(adapter.setCookie.mock.calls[0]?.[2]);
    adapter.setCookie.mockClear();

    await sessions.forHttp(request(`deckle_session=${secret}`), {}).current();
    expect(adapter.setCookie).not.toHaveBeenCalled();

    const [id, kept] = [...store.sessions][0] ?? [];
    if (id !== undefined && kept !== undefined) {
      store.sessions.set(id, { ...kept, seenAt: new Date(Date.now() - 2 * 24 * 60 * 60_000) });
    }
    const renewed = await sessions.forHttp(request(`deckle_session=${secret}`), {}).current();
    expect(renewed).not.toBeNull();
    expect(adapter.setCookie).toHaveBeenCalledWith({}, 'deckle_session', secret, expect.anything());
  });

  it('reads a subscription’s session from its upgrade, and never starts one there', async () => {
    const { sessions, request } = setUp();

    expect(await sessions.forSubscription(undefined).current()).toBeNull();
    const subscription = sessions.forSubscription(request('deckle_session=' + 'A'.repeat(43)));
    expect(await subscription.current()).toBeNull();
    await expect(subscription.ensure()).rejects.toThrow('A subscription cannot start a session');
  });

  it('clears a cookie that names no live session', async () => {
    const { adapter, sessions, request } = setUp();

    await sessions.forHttp(request('deckle_session=' + 'A'.repeat(43)), {}).current();

    expect(adapter.clearCookie).toHaveBeenCalledWith({}, 'deckle_session', {
      path: '/',
      secure: false,
    });
  });
});
