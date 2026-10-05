import { describe, expect, it } from 'vitest';
import { readJpegHeader } from '../image/jpeg-header.js';
import { imageHost, makeJpeg, withSegment } from '../test/images.js';
import { MetHttpError, MetResponseError } from './errors.js';
import { createGate } from './gate.js';
import { createHttp } from './http.js';
import { createRangeSource, parseContentRange } from './range-source.js';

const IMAGE = 'https://images.metmuseum.org/CRDImages/dp/original/DP820348.jpg';

function rangeSource(fetchStub: typeof fetch) {
  const http = createHttp({
    fetch: fetchStub,
    userAgent: 'Deckle/test',
    gate: createGate({ concurrency: 1, minIntervalMs: 0 }),
    timeoutMs: 1000,
    retries: 0,
    backoff: { baseMs: 1, maxMs: 1 },
    blockedWaitMs: 1,
    random: () => 0,
  });
  return createRangeSource(http, IMAGE);
}

describe('createRangeSource', () => {
  it('reads a header in one Range request and learns the file size from Content-Range', async () => {
    const jpeg = await makeJpeg(120, 80, { noise: true });
    const host = imageHost(jpeg);
    const source = rangeSource(host.fetch);
    await expect(readJpegHeader(source)).resolves.toMatchObject({ width: 120, height: 80 });
    expect(host.ranges).toEqual(['bytes=0-65535']);
    expect(source.requests).toBe(1);
    expect(source.size).toBe(jpeg.length);
  });

  it('jumps past metadata longer than one chunk with a request that starts beyond it', async () => {
    const jpeg = withSegment(withSegment(await makeJpeg(40, 30), 0xed, 40_000), 0xed, 40_000);
    const host = imageHost(jpeg);
    await expect(readJpegHeader(rangeSource(host.fetch))).resolves.toMatchObject({ width: 40 });
    // The second request starts at the marker after the two 40 kB segments, not at 64 KiB.
    expect(host.ranges).toEqual(['bytes=0-65535', 'bytes=80010-145545']);
  });

  it('copes with a server that ignores Range and sends the whole file', async () => {
    const jpeg = await makeJpeg(50, 60);
    const host = imageHost(jpeg, { ignoreRange: true });
    const source = rangeSource(host.fetch);
    await expect(readJpegHeader(source)).resolves.toMatchObject({ width: 50, height: 60 });
    expect(source.size).toBe(jpeg.length);
  });

  it('reads nothing past the end of the file', async () => {
    const jpeg = await makeJpeg(8, 8);
    const source = rangeSource(imageHost(jpeg).fetch);
    expect(await source.read(jpeg.length + 10, 4)).toHaveLength(0);
    expect(source.size).toBe(jpeg.length);
    // The last chunk reaches the end of the file, so a read past it costs no request.
    const tail = await source.read(jpeg.length - 2, 2);
    expect(Array.from(tail)).toEqual([0xff, 0xd9]);
    expect(await source.read(jpeg.length - 1, 8)).toHaveLength(1);
    expect(source.requests).toBe(2);
  });

  it('refuses an answer that is not an image, starts elsewhere, or is an error', async () => {
    const jpeg = await makeJpeg(8, 8);
    const html = rangeSource(imageHost(jpeg, { type: 'text/html' }).fetch);
    await expect(html.read(0, 2)).rejects.toBeInstanceOf(MetResponseError);

    const shifted = rangeSource(() =>
      Promise.resolve(
        new Response(jpeg.slice(0, 10), {
          status: 206,
          headers: { 'content-type': 'image/jpeg', 'content-range': `bytes 5-14/${jpeg.length}` },
        }),
      ),
    );
    await expect(shifted.read(0, 2)).rejects.toThrow('asked for bytes from 0');

    const missing = rangeSource(() =>
      Promise.resolve(new Response('<html></html>', { status: 404, statusText: 'Not Found' })),
    );
    await expect(missing.read(0, 2)).rejects.toBeInstanceOf(MetHttpError);
  });
});

describe('parseContentRange', () => {
  it('reads both forms and nothing else', () => {
    expect(parseContentRange('bytes 0-65535/4391204')).toEqual({
      start: 0,
      end: 65535,
      size: 4391204,
    });
    expect(parseContentRange('bytes */4391204')).toEqual({ start: null, end: null, size: 4391204 });
    expect(parseContentRange('items 0-1/2')).toBeNull();
    expect(parseContentRange(null)).toBeNull();
  });
});
