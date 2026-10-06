import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AsyncQueue } from './async-queue.js';
import { TopicListeners } from './topic-listeners.js';

const event = z.object({ n: z.int() });

describe('TopicListeners', () => {
  it('delivers an event to every subscriber of its topic, and to no one else', async () => {
    const listeners = new TopicListeners();
    const first = listeners.subscribe('a', event);
    const second = listeners.subscribe('a', event);
    const other = listeners.subscribe('b', event);

    listeners.deliver('a', { n: 1 });

    await expect(first.next()).resolves.toEqual({ value: { n: 1 }, done: false });
    await expect(second.next()).resolves.toEqual({ value: { n: 1 }, done: false });
    other.close();
    await expect(other.next()).resolves.toEqual({ value: undefined, done: true });
  });

  it('drops an event that is not in the shape its subscriber expects', async () => {
    const listeners = new TopicListeners();
    const queue = listeners.subscribe('a', event);

    listeners.deliver('a', { n: 'one' });
    listeners.deliver('a', { n: 2 });

    await expect(queue.next()).resolves.toEqual({ value: { n: 2 }, done: false });
  });

  it('forgets a subscriber once it unsubscribes', async () => {
    const listeners = new TopicListeners();
    const queue = listeners.subscribe('a', event);
    expect(listeners.size).toBe(1);

    await queue.return();

    expect(listeners.size).toBe(0);
  });
});

describe('AsyncQueue', () => {
  it('hands a pushed value to a reader already waiting', async () => {
    const queue = new AsyncQueue<number>(2, () => undefined);
    const waiting = queue.next();
    queue.push(1);
    await expect(waiting).resolves.toEqual({ value: 1, done: false });
  });

  it('keeps the newest values when a slow reader falls behind', async () => {
    const overflow = vi.fn();
    const queue = new AsyncQueue<number>(2, () => undefined, overflow);

    for (const value of [1, 2, 3]) queue.push(value);

    expect(overflow).toHaveBeenCalledOnce();
    await expect(queue.next()).resolves.toEqual({ value: 2, done: false });
    await expect(queue.next()).resolves.toEqual({ value: 3, done: false });
  });

  it('ends waiting readers when it closes, once, and ignores later pushes', async () => {
    const onClose = vi.fn();
    const queue = new AsyncQueue<number>(2, onClose);
    const waiting = queue.next();

    queue.close();
    queue.close();
    queue.push(1);

    await expect(waiting).resolves.toEqual({ value: undefined, done: true });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the consumer throws into it', async () => {
    const onClose = vi.fn();
    const queue = new AsyncQueue<number>(2, onClose);

    await expect(queue.throw(new Error('gone'))).rejects.toThrow('gone');
    expect(onClose).toHaveBeenCalledOnce();
    expect(queue[Symbol.asyncIterator]()).toBe(queue);
  });
});
