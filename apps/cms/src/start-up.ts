import { InvalidEnvironmentError, parseEnv, serverEnvSchema } from './env';

/**
 * Checks the environment, then asks this very server for its health.
 *
 * Payload runs its committed migrations (the adapter's `prodMigrations`) and
 * starts the jobs runner when it initialises, and it initialises with the
 * first request that needs it. Next.js gives this file its own copy of Payload,
 * separate from the routes', so starting an instance here would not be the
 * one that serves; a request to the server starts the right one, at boot
 * rather than whenever the first editor or probe arrives. Requests that come
 * in meanwhile wait for the same start, and a failed migration exits the
 * process.
 */
export function startPayloadWhenReady(): void {
  const port = portOrExit();
  void fetch(`http://127.0.0.1:${String(port)}/api/health`)
    .then(async (response) => {
      await response.body?.cancel();
      if (!response.ok) {
        log(50, `Payload did not start: the health check answered ${String(response.status)}`);
      }
    })
    .catch((error: unknown) => {
      log(50, `Payload did not start: ${error instanceof Error ? error.message : String(error)}`);
    });
}

/**
 * Next.js logs an error thrown from `register` and goes on serving, every
 * request failing; a server with a bad environment should not run at all.
 */
function portOrExit(): number {
  try {
    return parseEnv(serverEnvSchema, process.env).PORT;
  } catch (error) {
    if (!(error instanceof InvalidEnvironmentError)) {
      throw error;
    }
    log(60, 'The CMS cannot start: its environment is invalid', { problems: error.problems });
    process.exit(1);
  }
}

/** One JSON line, the shape Payload's own production logs have. */
function log(level: 50 | 60, msg: string, fields: Record<string, unknown> = {}): void {
  const line = { level, time: Date.now(), name: 'deckle-cms', msg, ...fields };
  process.stderr.write(`${JSON.stringify(line)}\n`);
}
