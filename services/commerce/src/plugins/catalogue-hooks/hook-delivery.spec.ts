import { createHmac } from 'node:crypto';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SIGNATURE_HEADER, signatureHeader, type CatalogueHookBody } from './hook-contract.js';
import { deliverHook, hookBackoffMs, RetryableDeliveryError } from './hook-delivery.js';

const secret = 'a-shared-hook-secret';

const body: CatalogueHookBody = {
  id: '6f0b5d0e-0f5e-4a8a-9d6b-4d1b8e0c2a11',
  source: 'commerce',
  type: 'price',
  action: 'updated',
  occurredAt: '2026-10-05T12:00:00.000Z',
  subject: { productId: '3', slug: 'melencolia-i', variantIds: ['7', '8'] },
};

describe('signatureHeader', () => {
  it('signs "<t>.<raw body>" with HMAC-SHA256, as the gateway checks it', () => {
    const raw = JSON.stringify(body);
    const expected = createHmac('sha256', secret).update(`1791200000.${raw}`).digest('hex');
    expect(signatureHeader(secret, raw, 1_791_200_000)).toBe(`t=1791200000,v1=${expected}`);
  });
});

interface Received {
  headers: IncomingHttpHeaders;
  raw: string;
}

describe('deliverHook', () => {
  const received: Received[] = [];
  let answer = 204;
  const server = createServer((request, response) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => (raw += chunk));
    request.on('end', () => {
      received.push({ headers: request.headers, raw });
      if (answer === 302) {
        response.setHeader('location', 'http://example.invalid/elsewhere');
      }
      response.statusCode = answer;
      response.end(answer === 204 ? undefined : 'a body nobody reads');
    });
  });
  let url: URL;

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/hooks/commerce`);
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const deliver = (status: number, now = () => 1_791_200_000_500) => {
    answer = status;
    return deliverHook({ url, secret, body, timeoutMs: 2_000, now });
  };

  it('POSTs the JSON body with a signature the receiver can check', async () => {
    received.length = 0;
    await expect(deliver(204)).resolves.toEqual({ kind: 'delivered', status: 204 });

    const [request] = received;
    expect(request?.headers['content-type']).toBe('application/json');
    expect(JSON.parse(request?.raw ?? '')).toEqual(body);
    const header = request?.headers[SIGNATURE_HEADER.toLowerCase()];
    expect(header).toBe(signatureHeader(secret, request?.raw ?? '', 1_791_200_000));
  });

  it('signs each attempt at its own time, with the same body and id', async () => {
    received.length = 0;
    await deliver(200, () => 1_791_200_000_000);
    await deliver(200, () => 1_791_203_600_000);
    const [first, second] = received;
    expect(first?.raw).toBe(second?.raw);
    expect(first?.headers['deckle-signature']).toMatch(/^t=1791200000,/);
    expect(second?.headers['deckle-signature']).toMatch(/^t=1791203600,/);
  });

  it.each([400, 410, 413, 422])(
    'gives up on a %i: the same bytes would be refused again',
    async (status) => {
      await expect(deliver(status)).resolves.toEqual({ kind: 'rejected', status });
    },
  );

  it.each([401, 404, 429, 500, 503])('retries a %i', async (status) => {
    const delivery = deliver(status);
    await expect(delivery).rejects.toBeInstanceOf(RetryableDeliveryError);
    await expect(delivery).rejects.toMatchObject({ status });
  });

  it('does not follow a redirect, which would carry the signed body elsewhere', async () => {
    received.length = 0;
    await expect(deliver(302)).rejects.toMatchObject({ status: 302 });
    expect(received).toHaveLength(1);
  });

  it('retries when the gateway cannot be reached', async () => {
    const refused = deliverHook({
      url: new URL('http://127.0.0.1:9/hooks/commerce'),
      secret,
      body,
      timeoutMs: 2_000,
    });
    await expect(refused).rejects.toMatchObject({ name: 'RetryableDeliveryError', status: null });
  });

  it('gives up on an attempt that outlives its timeout', async () => {
    const hanging = deliverHook({
      url,
      secret,
      body,
      timeoutMs: 50,
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('The request was aborted', { cause: init.signal?.reason }));
          });
        }),
    });
    await expect(hanging).rejects.toBeInstanceOf(RetryableDeliveryError);
  });
});

describe('hookBackoffMs', () => {
  it('doubles from about two seconds and stops at five minutes', () => {
    const delays = [1, 2, 3, 4, 12, 20].map((attempt) => hookBackoffMs(attempt, 'job-1'));
    const ratio = delays[0]! / 2_000;
    expect(ratio).toBeGreaterThanOrEqual(0.75);
    expect(ratio).toBeLessThanOrEqual(1.25);
    expect(delays.slice(0, 4)).toEqual(
      [1, 2, 4, 8].map((factor) => Math.round(2_000 * factor * ratio)),
    );
    expect(delays[4]).toBe(delays[5]);
    expect(delays[5]).toBeLessThanOrEqual(5 * 60_000 * 1.25);
  });

  it('gives a job the same delay on every poll, and spreads a burst of jobs', () => {
    expect(hookBackoffMs(3, 42)).toBe(hookBackoffMs(3, 42));
    const spread = new Set(Array.from({ length: 20 }, (_, id) => hookBackoffMs(3, id)));
    expect(spread.size).toBeGreaterThan(10);
  });

  it('copes with a job that has no id yet', () => {
    expect(hookBackoffMs(1, undefined)).toBe(1_500);
    expect(hookBackoffMs(0, null)).toBe(1_500);
  });
});
