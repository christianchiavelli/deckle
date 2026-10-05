import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGate } from './gate.js';

/** A promise the test settles by hand, to hold a task open. */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => (resolve = settle));
  return { promise, resolve };
}

describe('createGate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts tasks no closer than the interval, in the order they arrived', async () => {
    const gate = createGate({ concurrency: 4, minIntervalMs: 1000 });
    const starts: [string, number][] = [];
    const runs = ['a', 'b', 'c'].map((name) =>
      gate.run(() => {
        starts.push([name, Date.now()]);
        return Promise.resolve(name);
      }),
    );
    await vi.runAllTimersAsync();
    await expect(Promise.all(runs)).resolves.toEqual(['a', 'b', 'c']);
    expect(starts).toEqual([
      ['a', 0],
      ['b', 1000],
      ['c', 2000],
    ]);
  });

  it('never has more tasks in flight than its concurrency', async () => {
    const gate = createGate({ concurrency: 2, minIntervalMs: 0 });
    const holds = [deferred(), deferred(), deferred()];
    let inFlight = 0;
    let most = 0;
    const runs = holds.map((hold) =>
      gate.run(async () => {
        most = Math.max(most, ++inFlight);
        await hold.promise;
        inFlight--;
      }),
    );
    await vi.runAllTimersAsync();
    expect(inFlight).toBe(2);
    holds[0]!.resolve();
    await vi.runAllTimersAsync();
    expect(inFlight).toBe(2);
    holds[1]!.resolve();
    holds[2]!.resolve();
    await Promise.all(runs);
    expect(most).toBe(2);
  });

  it('frees the slot of a task that fails', async () => {
    const gate = createGate({ concurrency: 1, minIntervalMs: 0 });
    const failed = gate.run(() => Promise.reject(new Error('boom')));
    const next = gate.run(() => Promise.resolve('next'));
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('next');
  });

  it('refuses a concurrency below one and a negative interval', () => {
    expect(() => createGate({ concurrency: 0, minIntervalMs: 0 })).toThrow(RangeError);
    expect(() => createGate({ concurrency: 1.5, minIntervalMs: 0 })).toThrow(RangeError);
    expect(() => createGate({ concurrency: 1, minIntervalMs: -1 })).toThrow(RangeError);
  });
});
