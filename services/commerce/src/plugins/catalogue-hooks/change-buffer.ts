import { setTimeout as delay } from 'node:timers/promises';

export interface ChangeBufferOptions {
  /** Hand the batch over once nothing new has arrived for this long. */
  readonly quietMs: number;
  /** ...or once the oldest pending item has waited this long, so a steady trickle still flushes. */
  readonly maxWaitMs: number;
}

/**
 * Collects items and hands them over in batches: when the stream has been quiet for
 * `quietMs`, or `maxWaitMs` after the first item of a batch. Batches are handed over
 * one at a time, in order. Timers are unreferenced, so a pending batch never keeps a
 * process alive; whoever shuts down calls `drain()` first.
 */
export class ChangeBuffer<T> {
  private pending: T[] = [];
  private quietTimer: NodeJS.Timeout | undefined;
  private maxWaitTimer: NodeJS.Timeout | undefined;
  private lastAddedAt = 0;
  private handedOver: Promise<void> = Promise.resolve();

  constructor(
    private readonly options: ChangeBufferOptions,
    private readonly onBatch: (batch: T[]) => Promise<void>,
    private readonly onError: (error: unknown, size: number) => void,
  ) {}

  get size(): number {
    return this.pending.length;
  }

  add(items: readonly T[]): void {
    if (items.length === 0) {
      return;
    }
    this.pending.push(...items);
    this.lastAddedAt = Date.now();
    clearTimeout(this.quietTimer);
    this.quietTimer = setTimeout(() => void this.flush(), this.options.quietMs).unref();
    this.maxWaitTimer ??= setTimeout(() => void this.flush(), this.options.maxWaitMs).unref();
  }

  /** Hands over what is pending now. Resolves when it, and every batch before it, is done. */
  flush(): Promise<void> {
    clearTimeout(this.quietTimer);
    clearTimeout(this.maxWaitTimer);
    this.quietTimer = undefined;
    this.maxWaitTimer = undefined;
    const batch = this.pending;
    this.pending = [];
    if (batch.length > 0) {
      this.handedOver = this.handedOver.then(() =>
        this.onBatch(batch).catch((error: unknown) => {
          this.onError(error, batch.length);
        }),
      );
    }
    return this.handedOver;
  }

  /**
   * Waits until nothing has arrived for `settleMs`, then flushes. Events reach
   * subscribers only after their transaction commits, a tick or two after the code
   * that caused them has returned, so a caller about to exit gives them that time.
   */
  async drain(settleMs: number): Promise<void> {
    await delay(settleMs);
    for (;;) {
      const quietFor = Date.now() - this.lastAddedAt;
      if (quietFor >= settleMs) {
        break;
      }
      await delay(settleMs - quietFor);
    }
    await this.flush();
  }
}
