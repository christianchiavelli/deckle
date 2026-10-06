import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface ReceivedHook {
  readonly signature: string | null;
  readonly body: string;
  /** What the receiver answered. */
  readonly status: number;
}

export interface HookReceiver extends AsyncDisposable {
  readonly url: string;
  readonly received: readonly ReceivedHook[];
  /** Answers the next deliveries with these statuses, then goes back to 204. */
  answerNext(...statuses: number[]): void;
  /** Resolves once `count` deliveries have arrived. */
  waitFor(count: number, timeoutMs?: number): Promise<readonly ReceivedHook[]>;
}

/** A stand-in for the gateway's `POST /hooks/cms`, on a free local port. */
export async function startHookReceiver(): Promise<HookReceiver> {
  const received: ReceivedHook[] = [];
  const statuses: number[] = [];

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const status = statuses.shift() ?? 204;
      const signature = request.headers['deckle-signature'];
      received.push({
        signature: typeof signature === 'string' ? signature : null,
        body: Buffer.concat(chunks).toString('utf8'),
        status,
      });
      response.writeHead(status).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${String(port)}/hooks/cms`,
    received,
    answerNext: (...next) => statuses.push(...next),
    async waitFor(count, timeoutMs = 30_000) {
      const deadline = Date.now() + timeoutMs;
      while (received.length < count) {
        if (Date.now() > deadline) {
          throw new Error(`Expected ${String(count)} deliveries, got ${String(received.length)}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return received;
    },
    async [Symbol.asyncDispose]() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },
  };
}

/**
 * Checks a `Deckle-Signature` the way the gateway must: the MAC worked out
 * here, apart from the code that signs, compared in constant time, and the
 * timestamp within five minutes.
 */
export function signatureIsValid(secret: string, body: string, header: string | null): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!match?.[1] || !match[2]) {
    return false;
  }
  const timestamp = Number(match[1]);
  const expected = createHmac('sha256', secret).update(`${match[1]}.${body}`).digest();
  const fresh = Math.abs(Date.now() / 1000 - timestamp) <= 300;
  return fresh && timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}
