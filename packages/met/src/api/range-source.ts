import type { ByteSource } from '../image/jpeg-header.js';
import { MetHttpError, MetResponseError } from './errors.js';
import type { Http } from './http.js';

/** What one Range request brings back; reads inside it cost nothing more. */
const CHUNK_BYTES = 64 * 1024;

export interface RangeSource extends ByteSource {
  /** The whole file's size, once a response has said it. */
  readonly size: number | null;
  /** Requests made so far, for the curious and for tests. */
  readonly requests: number;
}

interface Chunk {
  readonly offset: number;
  readonly bytes: Uint8Array;
}

// "bytes 0-65535/4391204" on a 206, or "bytes" then an asterisk and the size on a 416.
export function parseContentRange(value: string | null) {
  const match = /^bytes (?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(value?.trim() ?? '');
  if (!match) return null;
  const [, start, end, size] = match;
  return {
    start: start === undefined ? null : Number(start),
    end: end === undefined ? null : Number(end),
    size: Number(size),
  };
}

/** Reads the start of a body and lets go of the rest, for a server that ignored the Range header. */
async function readPrefix(response: Response, length: number) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const prefix = new Uint8Array(length);
  let filled = 0;
  try {
    while (filled < length) {
      const { done, value } = await reader.read();
      if (done) break;
      const take = Math.min(value.length, length - filled);
      prefix.set(value.subarray(0, take), filled);
      filled += take;
    }
  } finally {
    await reader.cancel();
  }
  return prefix.subarray(0, filled);
}

/**
 * A byte source over a remote image, fetched in Range requests of 64 KiB.
 * The image host answers them with 206, so a header can be read without
 * downloading a file that may weigh tens of megabytes.
 */
export function createRangeSource(http: Http, url: string): RangeSource {
  let chunk: Chunk | null = null;
  let size: number | null = null;
  let requests = 0;

  function fetchChunk(offset: number, length: number): Promise<Chunk> {
    const end = offset + Math.max(length, CHUNK_BYTES) - 1;
    requests++;
    return http.get(
      url,
      async (response) => {
        const range = parseContentRange(response.headers.get('content-range'));
        if (response.status === 416) {
          await response.body?.cancel();
          size = range?.size ?? size;
          return { offset, bytes: new Uint8Array(0) };
        }
        if (response.status !== 200 && response.status !== 206) {
          await response.body?.cancel();
          throw new MetHttpError(url, response.status, response.statusText || 'no reason given');
        }
        const type = response.headers.get('content-type') ?? '';
        if (!type.startsWith('image/')) {
          await response.body?.cancel();
          throw new MetResponseError(url, `expected an image, got "${type}"`);
        }
        if (response.status === 200) {
          const whole = response.headers.get('content-length');
          size = whole === null ? null : Number(whole);
          return { offset, bytes: (await readPrefix(response, end + 1)).subarray(offset) };
        }
        if (range?.start !== offset) {
          await response.body?.cancel();
          throw new MetResponseError(url, `asked for bytes from ${offset}, got "${range?.start}"`);
        }
        size = range.size;
        return { offset, bytes: new Uint8Array(await response.arrayBuffer()) };
      },
      { headers: { range: `bytes=${offset}-${end}` } },
    );
  }

  return {
    get size() {
      return size;
    },
    get requests() {
      return requests;
    },
    async read(offset, length) {
      let current = chunk;
      if (!covers(current, offset, length, size)) {
        current = await fetchChunk(offset, length);
        chunk = current;
      }
      const start = offset - current.offset;
      return current.bytes.subarray(start, start + length);
    },
  };
}

function covers(
  chunk: Chunk | null,
  offset: number,
  length: number,
  size: number | null,
): chunk is Chunk {
  if (chunk === null || offset < chunk.offset) return false;
  const end = chunk.offset + chunk.bytes.length;
  // A chunk that reaches the end of the file holds all there is past `offset`.
  return offset + length <= end || (size !== null && end >= size);
}
