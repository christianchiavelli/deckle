import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryError, deliverEvent } from './deliver';
import { type CmsEvent, cmsEventSchema } from './event';
import { signatureHeader, signBody } from './signature';

const secret = 'unit-test-hook-secret-000000000000000000';
const target = { url: 'http://gateway.test/hooks/cms', secret };

const event: CmsEvent = {
  id: '6f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  source: 'cms',
  type: 'story',
  action: 'created',
  occurredAt: '2026-10-05T12:00:00.000Z',
  subject: { slug: 'melencolia-i', artworkSlug: 'melencolia-i' },
};

/** An HMAC worked out here, independently of `signBody`, the way the gateway checks it. */
const expectedMac = (timestamp: number, body: string) =>
  createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

describe('the event contract', () => {
  it('accepts each cms event type with its own subject', () => {
    expect(cmsEventSchema.parse(event)).toEqual(event);
    const curation = { ...event, type: 'curation', subject: { slug: 'first-impressions' } };
    expect(cmsEventSchema.parse(curation)).toEqual(curation);
    const dropPage = { ...event, type: 'drop-page', action: 'deleted', subject: { slug: 'x' } };
    expect(cmsEventSchema.parse(dropPage)).toEqual(dropPage);
  });

  it('refuses a story without its artwork, or another source', () => {
    expect(cmsEventSchema.safeParse({ ...event, subject: { slug: 'melencolia-i' } }).success).toBe(
      false,
    );
    expect(cmsEventSchema.safeParse({ ...event, source: 'commerce' }).success).toBe(false);
  });
});

describe('signBody', () => {
  it('signs "<t>.<body>" with HMAC-SHA256 as t=<seconds>,v1=<hex>', () => {
    const body = JSON.stringify(event);
    expect(signBody(secret, body, 1_791_201_600)).toBe(
      `t=1791201600,v1=${expectedMac(1_791_201_600, body)}`,
    );
  });
});

describe('deliverEvent', () => {
  const now = () => new Date('2026-10-05T12:00:07.900Z');

  it('posts the event as JSON, signed at send time', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deliverEvent(event, target, { fetch: send, now })).resolves.toEqual({
      status: 204,
    });

    expect(send).toHaveBeenCalledOnce();
    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe(target.url);
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('manual');
    const headers = new Headers(init?.headers);
    expect(headers.get('content-type')).toBe('application/json');
    const body = typeof init?.body === 'string' ? init.body : '';
    expect(JSON.parse(body)).toEqual(event);
    // Whole seconds, rounded down: 12:00:07.900 signs as 12:00:07.
    const seconds = Date.UTC(2026, 9, 5, 12, 0, 7) / 1000;
    expect(headers.get(signatureHeader)).toBe(`t=${seconds},v1=${expectedMac(seconds, body)}`);
  });

  it('fails on any answer that is not a success, so the job is retried', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response('busy', { status: 503 }));
    const failure = deliverEvent(event, target, { fetch: send, now });
    await expect(failure).rejects.toBeInstanceOf(DeliveryError);
    await expect(failure).rejects.toMatchObject({ eventId: event.id, status: 503 });
  });

  it('does not follow a redirect with a signed event', async () => {
    const redirect = new Response(null, {
      status: 307,
      headers: { location: 'http://elsewhere/' },
    });
    const send = vi.fn<typeof fetch>().mockResolvedValue(redirect);
    await expect(deliverEvent(event, target, { fetch: send })).rejects.toMatchObject({
      status: 307,
    });
  });

  it('fails when the gateway cannot be reached, keeping the cause', async () => {
    const cause = new TypeError('fetch failed');
    const send = vi.fn<typeof fetch>().mockRejectedValue(cause);
    const failure = deliverEvent(event, target, { fetch: send });
    await expect(failure).rejects.toThrow(`The gateway could not be reached for event ${event.id}`);
    await expect(failure).rejects.toMatchObject({ status: null, cause });
  });

  it('gives up on a gateway that does not answer in time', async () => {
    const send = vi.fn<typeof fetch>((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason as Error);
        });
      });
    });
    await expect(
      deliverEvent(event, target, { fetch: send, timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(DeliveryError);
  });
});
