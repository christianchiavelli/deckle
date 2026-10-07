import { afterEach, describe, expect, it, vi } from 'vitest';
import { repeat } from './repeat.js';

const logger = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('repeat', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs on its interval, never two runs at once', async () => {
    vi.useFakeTimers();
    let release: () => void = () => undefined;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const repeating = repeat('A slow task', 1000, task, logger());

    await vi.advanceTimersByTimeAsync(3500);
    expect(task).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
    release();
    await repeating.stop();
  });

  it('logs a failed run and tries again on the next', async () => {
    vi.useFakeTimers();
    const log = logger();
    const task = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('the database went away'))
      .mockRejectedValueOnce('not even an error')
      .mockResolvedValue(undefined);
    const repeating = repeat('Sweeping', 1000, task, log);

    await vi.advanceTimersByTimeAsync(3000);

    expect(log.warn).toHaveBeenCalledWith('Sweeping failed: the database went away');
    expect(log.warn).toHaveBeenCalledWith('Sweeping failed: not even an error');
    expect(task).toHaveBeenCalledTimes(3);
    await repeating.stop();
  });

  it('waits, when stopped, for the run under way', async () => {
    vi.useFakeTimers();
    let finished = false;
    const repeating = repeat(
      'A run',
      1000,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        finished = true;
      },
      logger(),
    );
    await vi.advanceTimersByTimeAsync(1000);

    const stopping = repeating.stop();
    await vi.advanceTimersByTimeAsync(500);
    await stopping;

    expect(finished).toBe(true);
  });
});
