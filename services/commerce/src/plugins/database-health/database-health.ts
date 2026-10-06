import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/** What a health check needs from Vendure's TransactionalConnection. */
export interface QueryableConnection {
  readonly rawConnection: { query(sql: string): Promise<unknown> };
}

/** Whether Postgres answers a trivial query in time. */
export async function databaseAnswers(
  connection: QueryableConnection,
  timeoutMs: number,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`no answer within ${timeoutMs} ms`));
    }, timeoutMs);
  });
  try {
    await Promise.race([connection.rawConnection.query('SELECT 1'), timedOut]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** The body Vendure's own `/health` sends when all is well, and its failing counterpart. */
export function writeHealth(response: ServerResponse, healthy: boolean): void {
  response.statusCode = healthy ? 200 : 503;
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(healthy ? { status: 'ok' } : { status: 'error', database: 'down' }));
}

export interface WorkerHealthOptions {
  readonly port: number;
  readonly hostname: string;
  readonly timeoutMs: number;
}

/**
 * The worker's `/health`, in place of Vendure's, which answers "ok" without looking at
 * anything. Unreferenced, so it never keeps a worker alive that is shutting down.
 */
export async function serveWorkerHealth(
  connection: QueryableConnection,
  options: WorkerHealthOptions,
): Promise<Server & { readonly port: number }> {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'GET' || request.url !== '/health') {
      response.statusCode = 404;
      response.end();
      return;
    }
    void databaseAnswers(connection, options.timeoutMs).then((healthy) => {
      writeHealth(response, healthy);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.hostname, resolve);
  });
  server.unref();
  return Object.assign(server, { port: (server.address() as AddressInfo).port });
}
