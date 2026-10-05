import { delay } from './delay.js';

export interface GateOptions {
  /** How many requests may be in flight at once. */
  readonly concurrency: number;
  /** The least time between the starts of two requests, which caps the rate. */
  readonly minIntervalMs: number;
}

/** Runs tasks no more than `concurrency` at a time, and starts them no closer than `minIntervalMs` apart. */
export interface Gate {
  run<T>(task: () => Promise<T>): Promise<T>;
}

export function createGate({ concurrency, minIntervalMs }: GateOptions): Gate {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`A gate lets at least one request through, not ${concurrency}`);
  }
  if (minIntervalMs < 0) {
    throw new RangeError(`An interval cannot be negative, not ${minIntervalMs}`);
  }

  let active = 0;
  let nextStart = 0;
  const waiting: (() => void)[] = [];

  async function acquire() {
    if (active < concurrency) {
      active++;
    } else {
      // The slot is handed over by `release`, so `active` is not touched here:
      // a newcomer can never slip in between the release and the wake-up.
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    // Start times are reserved in arrival order, so the spacing holds however
    // many tasks are queued and however long each one runs.
    const now = Date.now();
    const startAt = Math.max(now, nextStart);
    nextStart = startAt + minIntervalMs;
    if (startAt > now) await delay(startAt - now);
  }

  function release() {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }

  return {
    async run(task) {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
}
