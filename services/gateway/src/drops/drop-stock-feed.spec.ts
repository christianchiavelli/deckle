import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryDropStore } from '../../test/support/in-memory-accounts.js';
import { InMemoryPubSub } from '../../test/support/in-memory.js';
import { DropEvents } from './drop-events.js';
import { GATHER_MS, DropStockFeed } from './drop-stock-feed.js';

const MELENCOLIA = 'melencolia-i-numbered';

async function setUp() {
  const pubSub = new InMemoryPubSub();
  const events = new DropEvents(pubSub);
  const store = new InMemoryDropStore(events);
  await store.record([
    { slug: MELENCOLIA, artworkSlug: 'melencolia-i', editionSize: 3, opensAt: new Date(0) },
  ]);
  return { pubSub, events, store, feed: new DropStockFeed(events, store) };
}

describe('DropStockFeed', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the stock once per burst, and gives it to every watcher', async () => {
    vi.useFakeTimers();
    const { store, feed } = await setUp();
    const stock = vi.spyOn(store, 'stock');
    const first = feed.watch(MELENCOLIA);
    const second = feed.watch(MELENCOLIA);

    await store.claim(MELENCOLIA, 'ana', 10);
    await store.claim(MELENCOLIA, 'bo', 10);
    await vi.advanceTimersByTimeAsync(GATHER_MS);

    const [one, two] = await Promise.all([first.next(), second.next()]);
    expect(one.value).toMatchObject({ open: 1, held: 2, sold: 0 });
    expect(two.value).toEqual(one.value);
    expect(stock).toHaveBeenCalledTimes(1);
  });

  it('lets go of the topic when its last watcher leaves', async () => {
    const { pubSub, feed } = await setUp();
    const watcher = feed.watch(MELENCOLIA);
    const another = feed.watch(MELENCOLIA);
    expect(pubSub.subscribers).toBe(1);

    await watcher.return?.();
    expect(pubSub.subscribers).toBe(1);
    await another.return?.();
    await vi.waitFor(() => {
      expect(pubSub.subscribers).toBe(0);
    });
  });

  it('drops a gathered read when its watchers have gone', async () => {
    vi.useFakeTimers();
    const { store, feed } = await setUp();
    const stock = vi.spyOn(store, 'stock');
    const watcher = feed.watch(MELENCOLIA);
    await store.claim(MELENCOLIA, 'ana', 10);

    await watcher.return?.();
    await vi.advanceTimersByTimeAsync(GATHER_MS);

    expect(stock).not.toHaveBeenCalled();
  });

  it('logs a failed read and keeps watching', async () => {
    vi.useFakeTimers();
    const { store, events, feed } = await setUp();
    const watcher = feed.watch(MELENCOLIA);
    vi.spyOn(store, 'stock')
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce(new Map());

    await events.changed(MELENCOLIA);
    await vi.advanceTimersByTimeAsync(GATHER_MS);
    await events.changed(MELENCOLIA);
    await vi.advanceTimersByTimeAsync(GATHER_MS);
    await store.claim(MELENCOLIA, 'ana', 10);
    await vi.advanceTimersByTimeAsync(GATHER_MS);

    expect((await watcher.next()).value).toMatchObject({ held: 1 });
  });

  it('ends every watch when the gateway shuts down', async () => {
    const { feed } = await setUp();
    const watcher = feed.watch(MELENCOLIA);

    feed.onApplicationShutdown();

    expect(await watcher.next()).toEqual({ value: undefined, done: true });
  });
});
