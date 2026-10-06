import { Logger } from '@vendure/core';

const loggerCtx = 'Commerce';

/** JSON lines in containers, where `NODE_ENV` is production; Vendure's coloured text otherwise. */
export const logFormat = process.env['NODE_ENV'] === 'production' ? 'json' : 'text';

/**
 * How long a shutdown may take before the process exits regardless. Above the job
 * queue's 15 s grace for a running job, below compose's 20 s stop grace period.
 */
const SHUTDOWN_DEADLINE_MS = 18_000;

function fail(message: string, error: unknown): void {
  Logger.error(
    `${message}: ${error instanceof Error ? error.message : String(error)}`,
    loggerCtx,
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
  // A failed bootstrap can leave database handles open that would keep the process,
  // and its container, running in a broken state. The delay lets the log line flush.
  setTimeout(() => process.exit(1), 250);
}

/**
 * Runs one of the image's commands. Vendure registers Nest's shutdown hooks itself;
 * this adds a deadline for them, and makes every failure a logged exit with code 1.
 */
export function runProcess(name: string, main: () => Promise<void>): void {
  process.on('unhandledRejection', (reason) => {
    fail(`Unhandled rejection in the ${name}`, reason);
  });
  process.on('uncaughtException', (error) => {
    fail(`Uncaught exception in the ${name}`, error);
  });
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      Logger.info(`Received ${signal}, shutting the ${name} down`, loggerCtx);
      setTimeout(() => {
        Logger.error(`The ${name} did not shut down within ${SHUTDOWN_DEADLINE_MS} ms`, loggerCtx);
        process.exit(1);
      }, SHUTDOWN_DEADLINE_MS).unref();
    });
  }
  main().catch((error: unknown) => {
    fail(`The ${name} failed`, error);
  });
}
