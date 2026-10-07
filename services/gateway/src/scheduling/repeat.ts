import type { LoggerService } from '@nestjs/common';

/** A task that runs on an interval; `stop()` waits for a run in progress. */
export interface Repeating {
  stop(): Promise<void>;
}

/**
 * Runs `task` every `intervalMs`, one run at a time: a run that outlasts the
 * interval is not stacked on. A failure is logged as a warning and the next run
 * tries again. The timer never keeps the process alive.
 */
export function repeat(
  name: string,
  intervalMs: number,
  task: () => Promise<void>,
  logger: LoggerService,
): Repeating {
  let running: Promise<void> | null = null;
  const timer = setInterval(() => {
    if (running !== null) return;
    running = task()
      .catch((error: unknown) => {
        logger.warn(`${name} failed: ${error instanceof Error ? error.message : String(error)}`);
      })
      .finally(() => {
        running = null;
      });
  }, intervalMs);
  timer.unref();
  return {
    async stop() {
      clearInterval(timer);
      await running;
    },
  };
}
