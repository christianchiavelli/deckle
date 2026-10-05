import sharp from 'sharp';
import type { ByteSource } from '../image/jpeg-header.js';

/** A real JPEG of the given size, a flat colour unless `noise` asks for texture. */
export async function makeJpeg(
  width: number,
  height: number,
  {
    orientation,
    progressive = false,
    noise = false,
  }: {
    orientation?: number;
    progressive?: boolean;
    noise?: boolean;
  } = {},
): Promise<Uint8Array> {
  let image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 180, b: 150 },
      ...(noise && { noise: { type: 'gaussian', mean: 128, sigma: 40 } }),
    },
  }).jpeg({ progressive, quality: 80 });
  if (orientation !== undefined) image = image.withMetadata({ orientation });
  return new Uint8Array(await image.toBuffer());
}

/** Puts a segment with marker `marker` and `payloadBytes` of filler right after the SOI. */
export function withSegment(jpeg: Uint8Array, marker: number, payloadBytes: number): Uint8Array {
  const length = payloadBytes + 2;
  const segment = new Uint8Array(2 + length).fill(0x20);
  segment.set([0xff, marker, length >> 8, length & 0xff]);
  const out = new Uint8Array(jpeg.length + segment.length);
  out.set(jpeg.subarray(0, 2));
  out.set(segment, 2);
  out.set(jpeg.subarray(2), 2 + segment.length);
  return out;
}

/** A byte source over memory that remembers every range it was asked for. */
export function memorySource(bytes: Uint8Array) {
  const reads: [offset: number, length: number][] = [];
  const source: ByteSource = {
    read(offset, length) {
      reads.push([offset, length]);
      return Promise.resolve(bytes.subarray(offset, offset + length));
    },
  };
  return { source, reads };
}

/**
 * A stub `fetch` for the image host: answers Range requests with 206 and the
 * slice asked for, as images.metmuseum.org does, or the whole file when
 * `ignoreRange` is set.
 */
export function imageHost(bytes: Uint8Array, { ignoreRange = false, type = 'image/jpeg' } = {}) {
  const ranges: string[] = [];
  const fetchStub = (_input: string | URL | Request, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const range = headers.get('range');
    if (range !== null) ranges.push(range);
    const match = /^bytes=(\d+)-(\d+)$/.exec(range ?? '');
    if (ignoreRange || !match) {
      return Promise.resolve(
        new Response(bytes.slice(), {
          status: 200,
          headers: { 'content-type': type, 'content-length': String(bytes.length) },
        }),
      );
    }
    const start = Number(match[1]);
    const end = Math.min(Number(match[2]), bytes.length - 1);
    if (start >= bytes.length) {
      return Promise.resolve(
        new Response('', { status: 416, headers: { 'content-range': `bytes */${bytes.length}` } }),
      );
    }
    return Promise.resolve(
      new Response(bytes.slice(start, end + 1), {
        status: 206,
        headers: {
          'content-type': type,
          'content-range': `bytes ${start}-${end}/${bytes.length}`,
        },
      }),
    );
  };
  return { fetch: fetchStub, ranges };
}
