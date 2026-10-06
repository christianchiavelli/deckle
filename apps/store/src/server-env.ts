import { InvalidEnvironmentError, parseStoreEnv, type StoreEnv } from './env';

let checked: StoreEnv | undefined;

/** The environment, parsed once. The server checked it as it started (instrumentation). */
export function serverEnv(): StoreEnv {
  checked ??= parseStoreEnv(process.env);
  return checked;
}

/**
 * Next.js logs an error thrown from `register` and goes on serving, every
 * request failing; a store with a bad environment should not run at all.
 */
export function checkEnvironmentOrExit(): void {
  try {
    serverEnv();
  } catch (error) {
    if (!(error instanceof InvalidEnvironmentError)) {
      throw error;
    }
    const line = {
      level: 'fatal',
      time: new Date().toISOString(),
      service: 'store',
      message: 'The store cannot start: its environment is invalid',
      problems: error.problems,
    };
    process.stderr.write(`${JSON.stringify(line)}\n`);
    process.exit(1);
  }
}
