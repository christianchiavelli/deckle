import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

/** A hook as the gateway would receive it, and whether its signature held. */
export interface ReceivedHook {
  readonly body: {
    id: string;
    source: string;
    type: string;
    action: string;
    occurredAt: string;
    subject: Record<string, unknown>;
  };
  readonly signatureValid: boolean;
}

/**
 * The two things commerce needs from the gateway, on a local port: its public keys at
 * `/internal/jwks.json`, and `/hooks/commerce`, checking signatures the way the
 * gateway does (HMAC-SHA256 over "<t>.<raw body>", five minutes of tolerance).
 */
export interface GatewayStub extends AsyncDisposable {
  readonly jwksUrl: string;
  readonly hookUrl: string;
  readonly hooks: readonly ReceivedHook[];
  /** A token as the gateway signs it for a user, valid for 30 s. */
  signToken(userId: string, email?: string): Promise<string>;
  /** Waits for a hook that matches, polling what has arrived. */
  waitForHook(matches: (hook: ReceivedHook) => boolean, timeoutMs?: number): Promise<ReceivedHook>;
}

const KEY_ID = 'gateway-test';

function signatureHolds(header: string | undefined, raw: string, secret: string): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '');
  if (!match?.[1] || !match[2]) {
    return false;
  }
  const timestamp = Number(match[1]);
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(`${match[1]}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

/** A port nothing listens on yet, for a server that takes its port from config. */
export async function freePort(): Promise<number> {
  const server = createServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

export async function startGatewayStub(hookSecret: string): Promise<GatewayStub> {
  const { privateKey, publicKey } = await generateKeyPair('Ed25519');
  const jwks = JSON.stringify({
    keys: [{ ...(await exportJWK(publicKey)), kid: KEY_ID, use: 'sig' }],
  });
  const hooks: ReceivedHook[] = [];

  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/internal/jwks.json') {
      response.setHeader('content-type', 'application/json');
      response.end(jwks);
      return;
    }
    if (request.method === 'POST' && request.url === '/hooks/commerce') {
      let raw = '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => (raw += chunk));
      request.on('end', () => {
        const header = request.headers['deckle-signature'];
        const signatureValid = signatureHolds(
          typeof header === 'string' ? header : undefined,
          raw,
          hookSecret,
        );
        hooks.push({ body: JSON.parse(raw) as ReceivedHook['body'], signatureValid });
        response.statusCode = signatureValid ? 204 : 401;
        response.end();
      });
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  const origin = `http://127.0.0.1:${await listen(server)}`;

  return {
    jwksUrl: `${origin}/internal/jwks.json`,
    hookUrl: `${origin}/hooks/commerce`,
    hooks,
    signToken: (userId, email) =>
      new SignJWT(email === undefined ? {} : { email })
        .setProtectedHeader({ alg: 'EdDSA', kid: KEY_ID })
        .setIssuer('deckle-gateway')
        .setAudience('deckle-commerce')
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime('30s')
        .sign(privateKey),
    async waitForHook(matches, timeoutMs = 30_000) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const hook = hooks.find(matches);
        if (hook) {
          return hook;
        }
        if (Date.now() > deadline) {
          throw new Error(
            `No matching hook within ${timeoutMs} ms; received: ${JSON.stringify(hooks.map(({ body }) => [body.type, body.action, body.subject]))}`,
          );
        }
        await delay(200);
      }
    },
    async [Symbol.asyncDispose]() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
