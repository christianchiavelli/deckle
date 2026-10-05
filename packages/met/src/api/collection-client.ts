import { open, rename, rm } from 'node:fs/promises';
import type { z } from 'zod';
import { readJpegHeader, type JpegHeader } from '../image/jpeg-header.js';
import { MetHttpError, MetNotFoundError, MetResponseError } from './errors.js';
import { createGate, type GateOptions } from './gate.js';
import { createHttp, type Backoff } from './http.js';
import {
  metDepartmentsSchema,
  metErrorSchema,
  metObjectSchema,
  metSearchSchema,
  type MetDepartments,
  type MetObject,
} from './met-object.js';
import { createRangeSource } from './range-source.js';

export const API_BASE = 'https://collectionapi.metmuseum.org/public/collection';

/** Names the project and where to find it, so The Met can tell who is calling and reach us. */
export const USER_AGENT = 'Deckle/0.1 (+https://github.com/christianchiavelli/deckle)';

/** The search's paging window: `offset + limit` past this is silently cut short by the API. */
export const SEARCH_WINDOW = 10_000;
export const SEARCH_PAGE_MAX = 500;

/**
 * Filters of `/v1.1/search`. `isPublicDomain` is missing on purpose: the
 * search accepts it and ignores it, so the flag is read on each object.
 */
export interface SearchQuery {
  readonly q?: string;
  readonly hasImages?: boolean;
  readonly isHighlight?: boolean;
  readonly isOnView?: boolean;
  /** Match `q` against the title only. */
  readonly title?: boolean;
  /** Match `q` against the subject tags only. */
  readonly tags?: boolean;
  /** Match `q` against the artist or the culture only. */
  readonly artistOrCulture?: boolean;
  readonly departmentId?: number;
  /** Exact, case-sensitive terms: "Engraving" matches, "Engravings" finds nothing. */
  readonly medium?: readonly string[];
  readonly geoLocation?: readonly string[];
  /** The API ignores one bound without the other, so they only come as a pair. */
  readonly dates?: { readonly begin: number; readonly end: number };
  readonly offset?: number;
  readonly limit?: number;
}

export interface SearchPage {
  /** Every match, exact, not just those this page holds. */
  readonly total: number;
  readonly objectIds: readonly number[];
}

export interface ImageProbe extends JpegHeader {
  /** The file's size in bytes, when the host said. */
  readonly bytes: number | null;
  /** Range requests the probe took. */
  readonly requests: number;
}

export interface CollectionClient {
  object(objectId: number): Promise<MetObject>;
  search(query: SearchQuery): Promise<SearchPage>;
  departments(): Promise<MetDepartments['departments']>;
  /** An image's pixel size from its header, read with Range requests rather than a download. */
  probeImage(url: string): Promise<ImageProbe>;
  /** Streams an image to `destination`, through a `.part` file so a cut-off download never looks complete. */
  download(url: string, destination: string): Promise<{ bytes: number }>;
}

export interface CollectionClientOptions {
  readonly fetch: typeof fetch;
  readonly apiBase: string;
  readonly userAgent: string;
  /** The collection API: one request at a time, a second apart. */
  readonly apiPacing: GateOptions;
  /** The image host: two at a time, a second apart. */
  readonly imagePacing: GateOptions;
  readonly retries: number;
  readonly backoff: Backoff;
  readonly blockedWaitMs: number;
  readonly timeoutMs: number;
  readonly downloadTimeoutMs: number;
  readonly random: () => number;
}

/**
 * The CDN in front of The Met blocks an address for about a minute once it
 * passes roughly 80 requests a minute (docs/upstream-api.md), far below the 80
 * a second the documentation allows. One a second keeps a quarter below that
 * line, and an import of 50 works still takes only a few minutes.
 */
export const DEFAULT_CLIENT_OPTIONS: CollectionClientOptions = {
  fetch: (input, init) => fetch(input, init),
  apiBase: API_BASE,
  userAgent: USER_AGENT,
  apiPacing: { concurrency: 1, minIntervalMs: 1000 },
  imagePacing: { concurrency: 2, minIntervalMs: 1000 },
  retries: 4,
  backoff: { baseMs: 1000, maxMs: 60_000 },
  blockedWaitMs: 60_000,
  timeoutMs: 20_000,
  downloadTimeoutMs: 300_000,
  random: Math.random,
};

/** Builds the `/v1.1/search` URL, refusing a page the API would silently cut short or leave empty. */
export function searchUrl(apiBase: string, query: SearchQuery): string {
  const { offset = 0, limit = 100 } = query;
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_PAGE_MAX) {
    throw new RangeError(`A search page holds 1 to ${SEARCH_PAGE_MAX} results, not ${limit}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset + limit > SEARCH_WINDOW) {
    throw new RangeError(`Only the first ${SEARCH_WINDOW} results of a search can be paged to`);
  }

  const params = new URLSearchParams();
  if (query.q !== undefined) params.set('q', query.q);
  // The API reads its flags case-sensitively: "true" filters, "True" is ignored.
  for (const flag of [
    'hasImages',
    'isHighlight',
    'isOnView',
    'title',
    'tags',
    'artistOrCulture',
  ] as const) {
    const value = query[flag];
    if (value !== undefined) params.set(flag, String(value));
  }
  if (query.departmentId !== undefined) params.set('departmentId', String(query.departmentId));
  if (query.medium?.length) params.set('medium', query.medium.join('|'));
  if (query.geoLocation?.length) params.set('geoLocation', query.geoLocation.join('|'));
  if (query.dates) {
    params.set('dateBegin', String(query.dates.begin));
    params.set('dateEnd', String(query.dates.end));
  }
  params.set('offset', String(offset));
  params.set('limit', String(limit));
  return `${apiBase}/v1.1/search?${params.toString()}`;
}

async function readJson<T>(url: string, response: Response, schema: z.ZodType<T>): Promise<T> {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) {
    await response.body?.cancel();
    throw new MetResponseError(url, `expected JSON, got "${type}"`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new MetResponseError(url, 'the body is not valid JSON', { cause: error });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const where = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new MetResponseError(url, where, { cause: parsed.error });
  }
  return parsed.data;
}

/** Writes a body to `path` chunk by chunk, waiting on each write, and returns its size. */
async function writeBody(body: ReadableStream<Uint8Array>, path: string) {
  const file = await open(path, 'w');
  const reader = body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return size;
      await file.write(value);
      size += value.length;
    }
  } catch (error) {
    // Let go of the connection too, not only of the file.
    await reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
    await file.close();
  }
}

/** The API's own error message, or the status text when the body says nothing readable. */
async function errorMessage(response: Response) {
  try {
    const parsed = metErrorSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.message : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function createCollectionClient(
  overrides: Partial<CollectionClientOptions> = {},
): CollectionClient {
  const options = { ...DEFAULT_CLIENT_OPTIONS, ...overrides };
  const common = {
    fetch: options.fetch,
    userAgent: options.userAgent,
    retries: options.retries,
    backoff: options.backoff,
    blockedWaitMs: options.blockedWaitMs,
    timeoutMs: options.timeoutMs,
    random: options.random,
  };
  const api = createHttp({ ...common, gate: createGate(options.apiPacing) });
  const images = createHttp({ ...common, gate: createGate(options.imagePacing) });
  const v1 = `${options.apiBase}/v1`;

  async function json<T>(url: string, schema: z.ZodType<T>): Promise<T> {
    return api.get(url, async (response) => {
      if (!response.ok) throw new MetHttpError(url, response.status, await errorMessage(response));
      return readJson(url, response, schema);
    });
  }

  return {
    object(objectId) {
      const url = `${v1}/objects/${objectId}`;
      return api.get(url, async (response) => {
        if (response.status === 404) {
          const message = await errorMessage(response);
          throw new MetNotFoundError(
            url,
            /not a valid object/i.test(message) ? 'withdrawn' : 'unknown',
          );
        }
        if (!response.ok) {
          throw new MetHttpError(url, response.status, await errorMessage(response));
        }
        return readJson(url, response, metObjectSchema);
      });
    },

    async search(query) {
      const page = await json(searchUrl(options.apiBase, query), metSearchSchema);
      return { total: page.total, objectIds: page.objectIDs ?? [] };
    },

    async departments() {
      return (await json(`${v1}/departments`, metDepartmentsSchema)).departments;
    },

    async probeImage(url) {
      const source = createRangeSource(images, url);
      const header = await readJpegHeader(source);
      return { ...header, bytes: source.size, requests: source.requests };
    },

    download(url, destination) {
      return images.get(
        url,
        async (response) => {
          if (response.status !== 200 || response.body === null) {
            await response.body?.cancel();
            throw new MetHttpError(url, response.status, response.statusText || 'no body');
          }
          const type = response.headers.get('content-type') ?? '';
          if (!type.startsWith('image/')) {
            await response.body.cancel();
            throw new MetResponseError(url, `expected an image, got "${type}"`);
          }
          // A length only counts the bytes written when nothing was decoded on the way.
          const expected =
            response.headers.get('content-encoding') === null
              ? response.headers.get('content-length')
              : null;
          const partial = `${destination}.part`;
          try {
            const size = await writeBody(response.body, partial);
            if (expected !== null && size !== Number(expected)) {
              throw new MetResponseError(url, `received ${size} of ${expected} bytes`);
            }
            await rename(partial, destination);
            return { bytes: size };
          } finally {
            await rm(partial, { force: true });
          }
        },
        { timeoutMs: options.downloadTimeoutMs },
      );
    },
  };
}
