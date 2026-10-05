import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetBlockedError, MetHttpError, MetRequestError } from './errors.js';
import { createGate } from './gate.js';
import { backoffDelay, createHttp, isCdnBlock, parseRetryAfter, type HttpOptions } from './http.js';

const URL = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/1';

const json =
  (body: unknown, init: ResponseInit = {}) =>
  () => {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(body), { ...init, headers });
  };
const blockPage = () => () =>
  new Response('<html>Request unsuccessful. Incapsula incident ID: 0</html>', {
    status: 403,
    headers: { 'content-type': 'text/html' },
  });

type Answer = Error | ((init: RequestInit) => Response | Promise<Response>);

/**
 * A stub `fetch` that answers from a script, one entry per call (the last one
 * repeats), and notes when each call came. Each answer builds a fresh Response:
 * a cloned one could not be cancelled while its twin stayed unread.
 */
function scripted(...answers: Answer[]) {
  const calls: { at: number; init: RequestInit }[] = [];
  const stub = vi.fn((_input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ at: Date.now(), init });
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)]!;
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer(init));
  });
  return { fetch: stub as unknown as typeof fetch, calls };
}

function http(fetchStub: typeof fetch, overrides: Partial<HttpOptions> = {}) {
  return createHttp({
    fetch: fetchStub,
    userAgent: 'Deckle/test',
    gate: createGate({ concurrency: 1, minIntervalMs: 0 }),
    timeoutMs: 1000,
    retries: 3,
    backoff: { baseMs: 100, maxMs: 1000 },
    blockedWaitMs: 60_000,
    random: () => 0.5,
    ...overrides,
  });
}

const text = (response: Response) => response.text();

describe('createHttp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends the user agent and returns what `read` makes of the response', async () => {
    const { fetch, calls } = scripted(json({ ok: true }));
    await expect(http(fetch).get(URL, (response) => response.json())).resolves.toEqual({
      ok: true,
    });
    expect(calls[0]!.init.headers).toMatchObject({ 'user-agent': 'Deckle/test' });
    expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('retries a 5xx after a jittered, growing wait', async () => {
    vi.useFakeTimers({ now: 0 });
    const { fetch, calls } = scripted(
      json({}, { status: 503 }),
      json({}, { status: 502 }),
      json('third'),
    );
    const result = http(fetch).get(URL, (response) => response.json());
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('third');
    // Half of 100 ms, then half of 200 ms: random() is pinned at 0.5.
    expect(calls.map((call) => call.at)).toEqual([0, 50, 150]);
  });

  it('waits as long as a 429 asks, though never past the longest backoff', async () => {
    vi.useFakeTimers({ now: 0 });
    const { fetch, calls } = scripted(
      json({}, { status: 429, headers: { 'retry-after': '2' } }),
      json({}, { status: 429, headers: { 'retry-after': '30' } }),
      json('done'),
    );
    const result = http(fetch, { backoff: { baseMs: 100, maxMs: 5000 } }).get(URL, (r) => r.json());
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('done');
    expect(calls.map((call) => call.at)).toEqual([0, 2000, 7000]);
  });

  it('retries a network failure', async () => {
    vi.useFakeTimers({ now: 0 });
    const { fetch, calls } = scripted(new TypeError('fetch failed'), json('back'));
    const result = http(fetch).get(URL, (response) => response.json());
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('back');
    expect(calls).toHaveLength(2);
  });

  it('cuts an attempt off at its timeout and tries again', async () => {
    const hang = (init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason as Error);
        });
      });
    const { fetch, calls } = scripted(hang, json('in time'));
    const client = http(fetch, { timeoutMs: 20, backoff: { baseMs: 1, maxMs: 1 } });
    await expect(client.get(URL, (response) => response.json())).resolves.toBe('in time');
    expect(calls).toHaveLength(2);
    expect(calls[0]!.init.signal?.reason).toMatchObject({ name: 'TimeoutError' });
  });

  it('retries a body that breaks off halfway, since `read` runs inside the attempt', async () => {
    vi.useFakeTimers({ now: 0 });
    const { fetch } = scripted(json('whole'));
    const read = vi
      .fn<(response: Response) => Promise<unknown>>()
      .mockRejectedValueOnce(new TypeError('terminated'))
      .mockImplementation((response) => response.json());
    const result = http(fetch).get(URL, read);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('whole');
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('waits out a CDN block before trying again, and names it when it persists', async () => {
    vi.useFakeTimers({ now: 0 });
    const { fetch, calls } = scripted(blockPage());
    const result = http(fetch, { retries: 1 }).get(URL, text);
    const settled = expect(result).rejects.toBeInstanceOf(MetBlockedError);
    await vi.runAllTimersAsync();
    await settled;
    expect(calls.map((call) => call.at)).toEqual([0, 60_050]);
  });

  it('hands a status it does not retry to `read` as it came', async () => {
    const { fetch, calls } = scripted(json({ message: 'ObjectID not found' }, { status: 404 }));
    await expect(
      http(fetch).get(URL, (response) => Promise.resolve(response.status)),
    ).resolves.toBe(404);
    expect(calls).toHaveLength(1);
  });

  it('reports the last status once the retries run out', async () => {
    vi.useFakeTimers({ now: 0 });
    const { fetch, calls } = scripted(json({}, { status: 502, statusText: 'Bad Gateway' }));
    const result = http(fetch).get(URL, text);
    const settled = expect(result).rejects.toMatchObject({ name: 'MetHttpError', status: 502 });
    await vi.runAllTimersAsync();
    await settled;
    expect(calls).toHaveLength(4);
  });

  it('reports a network failure that never clears, with the failure as its cause', async () => {
    vi.useFakeTimers({ now: 0 });
    const cause = new TypeError('fetch failed');
    const { fetch } = scripted(cause);
    const result = http(fetch, { retries: 2 }).get(URL, text);
    const settled = expect(result).rejects.toSatisfy(
      (error) => error instanceof MetRequestError && error.cause === cause,
    );
    await vi.runAllTimersAsync();
    await settled;
  });

  it('does not retry an error it does not recognise', async () => {
    const { fetch, calls } = scripted(new RangeError('a bug, not the network'));
    await expect(http(fetch).get(URL, text)).rejects.toThrow('a bug, not the network');
    expect(calls).toHaveLength(1);
  });
});

describe('the retry helpers', () => {
  it('backoffDelay draws below a ceiling that doubles up to the maximum', () => {
    const backoff = { baseMs: 1000, maxMs: 5000 };
    expect(backoffDelay(0, backoff, () => 0.999)).toBe(999);
    expect(backoffDelay(2, backoff, () => 0.5)).toBe(2000);
    expect(backoffDelay(10, backoff, () => 0.5)).toBe(2500);
    expect(backoffDelay(3, backoff, () => 0)).toBe(0);
  });

  it('parseRetryAfter reads seconds and HTTP dates, and nothing else', () => {
    const now = Date.parse('2026-10-05T18:00:00Z');
    expect(parseRetryAfter('120', now)).toBe(120_000);
    expect(parseRetryAfter('Mon, 05 Oct 2026 18:00:30 GMT', now)).toBe(30_000);
    expect(parseRetryAfter('Mon, 05 Oct 2026 17:00:00 GMT', now)).toBe(0);
    expect(parseRetryAfter('soon', now)).toBeNull();
    expect(parseRetryAfter(null, now)).toBeNull();
  });

  it('isCdnBlock tells the CDN’s HTML 403 from a JSON one', () => {
    expect(isCdnBlock(blockPage()())).toBe(true);
    expect(isCdnBlock(json({ message: 'no' }, { status: 403 })())).toBe(false);
    expect(isCdnBlock(new Response('', { status: 404 }))).toBe(false);
  });

  it('MetHttpError carries the URL and the status', () => {
    const error = new MetHttpError(URL, 500, 'Internal Server Error');
    expect(error).toMatchObject({ url: URL, status: 500 });
    expect(error.message).toContain('answered 500');
  });
});
