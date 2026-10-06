import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeBuffer } from './change-buffer.js';

function buffer(options = { quietMs: 1_000, maxWaitMs: 5_000 }) {
  const batches: number[][] = [];
  const errors: { error: unknown; size: number }[] = [];
  let failNext = false;
  const changes = new ChangeBuffer<number>(
    options,
    (batch) => {
      if (failNext) {
        failNext = false;
        return Promise.reject(new Error('the database went away'));
      }
      batches.push(batch);
      return Promise.resolve();
    },
    (error, size) => errors.push({ error, size }),
  );
  return { changes, batches, errors, failOnce: () => (failNext = true) };
}

describe('ChangeBuffer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hands a burst over once it has been quiet for quietMs', async () => {
    vi.useFakeTimers();
    const { changes, batches } = buffer();
    changes.add([1, 2]);
    await vi.advanceTimersByTimeAsync(900);
    changes.add([3]);
    await vi.advanceTimersByTimeAsync(900);
    expect(batches).toEqual([]);
    expect(changes.size).toBe(3);
    await vi.advanceTimersByTimeAsync(100);
    expect(batches).toEqual([[1, 2, 3]]);
    expect(changes.size).toBe(0);
  });

  it('hands a steady trickle over every maxWaitMs', async () => {
    vi.useFakeTimers();
    const { changes, batches } = buffer();
    for (let second = 0; second < 6; second += 1) {
      changes.add([second]);
      await vi.advanceTimersByTimeAsync(900);
    }
    expect(batches).toEqual([[0, 1, 2, 3, 4, 5]]);
  });

  it('ignores an empty add, which would otherwise restart the quiet timer', async () => {
    vi.useFakeTimers();
    const { changes, batches } = buffer();
    changes.add([1]);
    await vi.advanceTimersByTimeAsync(600);
    changes.add([]);
    await vi.advanceTimersByTimeAsync(400);
    expect(batches).toEqual([[1]]);
  });

  it('hands batches over one at a time, in order', async () => {
    const order: string[] = [];
    const changes = new ChangeBuffer<string>(
      { quietMs: 1_000, maxWaitMs: 5_000 },
      async (batch) => {
        order.push(`start ${batch.join()}`);
        await delay(batch[0] === 'a' ? 30 : 1);
        order.push(`end ${batch.join()}`);
      },
      () => undefined,
    );
    changes.add(['a']);
    const first = changes.flush();
    changes.add(['b']);
    await Promise.all([first, changes.flush()]);
    expect(order).toEqual(['start a', 'end a', 'start b', 'end b']);
  });

  it('reports a failed batch and carries on with the next', async () => {
    const { changes, batches, errors, failOnce } = buffer();
    failOnce();
    changes.add([1, 2]);
    await changes.flush();
    changes.add([3]);
    await changes.flush();
    expect(errors).toEqual([{ error: new Error('the database went away'), size: 2 }]);
    expect(batches).toEqual([[3]]);
  });

  it('drains only after the stream has settled, catching events that arrive late', async () => {
    const { changes, batches } = buffer({ quietMs: 60_000, maxWaitMs: 60_000 });
    changes.add([1]);
    const drained = changes.drain(40);
    await delay(25);
    changes.add([2]);
    await drained;
    expect(batches).toEqual([[1, 2]]);
  });
});
