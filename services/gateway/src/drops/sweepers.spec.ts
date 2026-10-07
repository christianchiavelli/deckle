import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryDropStore, InMemorySessionStore } from '../../test/support/in-memory-accounts.js';
import { InMemoryPubSub } from '../../test/support/in-memory.js';
import { SessionSweeper } from '../sessions/session-sweeper.js';
import { DropEvents } from './drop-events.js';
import { DropSweeper, SWEEP_EVERY_MS } from './drop-sweeper.js';

describe('the sweepers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('open lapsed holds again every second, and tell the watchers', async () => {
    vi.useFakeTimers();
    const pubSub = new InMemoryPubSub();
    const store = new InMemoryDropStore(new DropEvents(pubSub));
    await store.record([
      {
        slug: 'melencolia-i-numbered',
        artworkSlug: 'melencolia-i',
        editionSize: 2,
        opensAt: new Date(0),
      },
    ]);
    await store.claim('melencolia-i-numbered', 'ana', 10);
    store.expire('melencolia-i-numbered', 'ana');
    pubSub.published.length = 0;
    const sweeper = new DropSweeper(store);

    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(SWEEP_EVERY_MS);

    expect(pubSub.published).toEqual([
      { topic: 'drop-changed:melencolia-i-numbered', payload: { slug: 'melencolia-i-numbered' } },
    ]);
    expect((await store.stock(['melencolia-i-numbered'])).get('melencolia-i-numbered')?.open).toBe(
      2,
    );
    await sweeper.onApplicationShutdown();
  });

  it('delete expired sessions every ten minutes', async () => {
    vi.useFakeTimers();
    const store = new InMemorySessionStore();
    await store.replace(null, {
      id: 'gone',
      userId: null,
      cartToken: null,
      customerToken: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    const sweeper = new SessionSweeper(store);

    sweeper.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(store.sessions.size).toBe(0);
    await sweeper.onApplicationShutdown();
  });
});
