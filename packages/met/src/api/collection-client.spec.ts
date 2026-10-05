import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageHost, makeJpeg } from '../test/images.js';
import {
  API_BASE,
  createCollectionClient,
  searchUrl,
  USER_AGENT,
  type CollectionClientOptions,
} from './collection-client.js';
import { MetHttpError, MetNotFoundError, MetResponseError } from './errors.js';
import melencolia from './fixtures/336228-melencolia-i.json' with { type: 'json' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A client with no pacing and no retries, over a stub `fetch`. */
function client(fetchStub: (url: string, init?: RequestInit) => Promise<Response>) {
  const options: Partial<CollectionClientOptions> = {
    fetch: (input, init) =>
      fetchStub(input instanceof Request ? input.url : input.toString(), init),
    apiPacing: { concurrency: 1, minIntervalMs: 0 },
    imagePacing: { concurrency: 1, minIntervalMs: 0 },
    retries: 0,
  };
  return createCollectionClient(options);
}

describe('searchUrl', () => {
  it('writes flags in lowercase, joins lists with "|", and always pages', () => {
    const url = new URL(
      searchUrl(API_BASE, {
        q: 'Hokusai',
        hasImages: true,
        artistOrCulture: false,
        departmentId: 6,
        medium: ['Prints', 'Woodblock print'],
        geoLocation: ['Japan'],
        dates: { begin: 1800, end: 1850 },
        offset: 100,
        limit: 50,
      }),
    );
    expect(url.pathname).toBe('/public/collection/v1.1/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'Hokusai',
      hasImages: 'true',
      artistOrCulture: 'false',
      departmentId: '6',
      medium: 'Prints|Woodblock print',
      geoLocation: 'Japan',
      dateBegin: '1800',
      dateEnd: '1850',
      offset: '100',
      limit: '50',
    });
  });

  it('refuses a page the API would cut short or leave empty without saying so', () => {
    expect(() => searchUrl(API_BASE, { limit: 0 })).toThrow(RangeError);
    expect(() => searchUrl(API_BASE, { limit: 501 })).toThrow('1 to 500');
    expect(() => searchUrl(API_BASE, { offset: -1 })).toThrow(RangeError);
    expect(() => searchUrl(API_BASE, { offset: 9_950, limit: 100 })).toThrow('first 10000');
    expect(searchUrl(API_BASE, { offset: 9_900, limit: 100 })).toContain('offset=9900');
  });
});

describe('createCollectionClient', () => {
  it('names itself in the User-Agent of every request', async () => {
    const seen = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(json({ departments: [] })),
    );
    await client(seen).departments();
    expect(new Headers(seen.mock.calls[0]![1]?.headers).get('user-agent')).toBe(USER_AGENT);
    expect(USER_AGENT).toContain('github.com/christianchiavelli/deckle');
  });

  it('reads an object through the raw schema', async () => {
    const met = client((url) => {
      expect(url).toBe(`${API_BASE}/v1/objects/336228`);
      return Promise.resolve(json(melencolia));
    });
    await expect(met.object(336228)).resolves.toMatchObject({
      objectID: 336228,
      isPublicDomain: true,
      primaryImage: 'https://images.metmuseum.org/CRDImages/dp/original/DP820348.jpg',
    });
  });

  it('tells an id that never existed from a record that was withdrawn', async () => {
    const met = client((url) =>
      Promise.resolve(
        url.endsWith('/1')
          ? json({ message: 'ObjectID not found' }, 404)
          : json({ message: 'Not a valid object' }, 404),
      ),
    );
    await expect(met.object(1)).rejects.toMatchObject({
      name: 'MetNotFoundError',
      reason: 'unknown',
    });
    await expect(met.object(101039)).rejects.toMatchObject({ reason: 'withdrawn' });
    await expect(met.object(101039)).rejects.toBeInstanceOf(MetNotFoundError);
  });

  it('passes The Met’s own message along with any other error status', async () => {
    const met = client(() => Promise.resolve(json({ message: 'could not parse objectID' }, 400)));
    await expect(met.object(1)).rejects.toThrow('answered 400: could not parse objectID');
    const plain = client(() =>
      Promise.resolve(new Response('oops', { status: 400, statusText: 'Bad Request' })),
    );
    await expect(plain.object(1)).rejects.toThrow('answered 400: Bad Request');
  });

  it('refuses a body that is not JSON, not valid JSON, or not the promised shape', async () => {
    const html = client(() =>
      Promise.resolve(new Response('<html></html>', { headers: { 'content-type': 'text/html' } })),
    );
    await expect(html.object(1)).rejects.toThrow('expected JSON, got "text/html"');

    const broken = client(() =>
      Promise.resolve(
        new Response('{"objectID":', { headers: { 'content-type': 'application/json' } }),
      ),
    );
    await expect(broken.object(1)).rejects.toThrow('not valid JSON');

    const wrong = client(() => Promise.resolve(json({ ...melencolia, isPublicDomain: 'yes' })));
    await expect(wrong.object(1)).rejects.toSatisfy(
      (error) => error instanceof MetResponseError && error.message.includes('isPublicDomain'),
    );
  });

  it('reads a search page, with no ids past the last match as an empty page', async () => {
    const met = client((url) =>
      Promise.resolve(
        url.includes('offset=0')
          ? json({ total: 2, objectIDs: [45434, 36491] })
          : json({ total: 2, objectIDs: null }),
      ),
    );
    await expect(met.search({ q: 'Hokusai' })).resolves.toEqual({
      total: 2,
      objectIds: [45434, 36491],
    });
    await expect(met.search({ q: 'Hokusai', offset: 2 })).resolves.toEqual({
      total: 2,
      objectIds: [],
    });
  });

  it('lists the departments', async () => {
    const met = client(() =>
      Promise.resolve(
        json({ departments: [{ departmentId: 9, displayName: 'Drawings and Prints' }] }),
      ),
    );
    await expect(met.departments()).resolves.toEqual([
      { departmentId: 9, displayName: 'Drawings and Prints' },
    ]);
  });

  it('probes an image’s size from its header with one Range request', async () => {
    const jpeg = await makeJpeg(90, 70, { noise: true });
    const host = imageHost(jpeg);
    const met = client((url, init) => host.fetch(url, init));
    await expect(met.probeImage('https://images.metmuseum.org/x.jpg')).resolves.toMatchObject({
      width: 90,
      height: 70,
      bytes: jpeg.length,
      requests: 1,
    });
  });
});

describe('download', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'deckle-download-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const image = (body: Uint8Array, headers: Record<string, string> = {}) =>
    new Response(body.slice(), {
      headers: { 'content-type': 'image/jpeg', 'content-length': String(body.length), ...headers },
    });

  it('streams the file to disk under its final name only once it is whole', async () => {
    const jpeg = await makeJpeg(30, 20);
    const target = join(dir, 'original.jpg');
    await expect(
      client(() => Promise.resolve(image(jpeg))).download('https://x/y.jpg', target),
    ).resolves.toEqual({ bytes: jpeg.length });
    expect(new Uint8Array(await readFile(target))).toEqual(jpeg);
    expect(await readdir(dir)).toEqual(['original.jpg']);
  });

  it('keeps nothing of a download that came up short', async () => {
    const jpeg = await makeJpeg(30, 20);
    const short = client(() =>
      Promise.resolve(image(jpeg.subarray(0, 100), { 'content-length': String(jpeg.length) })),
    );
    await expect(short.download('https://x/y.jpg', join(dir, 'original.jpg'))).rejects.toThrow(
      `received 100 of ${jpeg.length} bytes`,
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it('lets go of a download that breaks off, and keeps nothing of it', async () => {
    const jpeg = await makeJpeg(30, 20);
    const breaking = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(jpeg.subarray(0, 50));
        controller.error(new Error('connection reset'));
      },
    });
    const met = client(() =>
      Promise.resolve(new Response(breaking, { headers: { 'content-type': 'image/jpeg' } })),
    );
    await expect(met.download('https://x/y.jpg', join(dir, 'a.jpg'))).rejects.toThrow(
      'connection reset',
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it('refuses a page that is not an image, and an error status', async () => {
    const html = client(() =>
      Promise.resolve(new Response('<html></html>', { headers: { 'content-type': 'text/html' } })),
    );
    await expect(html.download('https://x/y.jpg', join(dir, 'a.jpg'))).rejects.toBeInstanceOf(
      MetResponseError,
    );
    const missing = client(() => Promise.resolve(new Response('', { status: 404 })));
    await expect(missing.download('https://x/y.jpg', join(dir, 'a.jpg'))).rejects.toBeInstanceOf(
      MetHttpError,
    );
    expect(await readdir(dir)).toEqual([]);
  });
});
