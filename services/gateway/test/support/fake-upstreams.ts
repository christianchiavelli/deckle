import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { FakeShop } from './fake-shop.js';
import * as fixtures from './fixtures.js';

export interface RecordedRequest {
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
  readonly headers: IncomingMessage['headers'];
  readonly body: unknown;
}

export type UpstreamMode = 'ok' | 'unavailable';

export const CMS_TEST_API_KEY = 'cms-api-key-for-the-test-suite-only';

/**
 * Commerce, the CMS and the store, as small HTTP servers answering the requests
 * the gateway makes with fixture documents. Every request is recorded, so a test
 * can count round trips and check headers.
 */
export class FakeUpstreams {
  readonly requests = {
    commerce: [] as RecordedRequest[],
    cms: [] as RecordedRequest[],
    store: [] as RecordedRequest[],
  };
  modes = { commerce: 'ok' as UpstreamMode, cms: 'ok' as UpstreamMode };
  storeStatus = 204;
  /** Commerce's carts, checkouts and customer sessions. */
  readonly shop = new FakeShop();
  products = fixtures.products;
  stories = fixtures.stories;
  /**
   * Newer drafts of stories that are published, which Payload answers in their
   * place only when asked with `draft=true`.
   */
  storyDrafts: typeof fixtures.stories = [];
  /** Answers drafts even to a published-only query, as a misconfigured CMS would. */
  ignoreStatusFilter = false;
  /**
   * The words an editor translated, which Payload answers in their place when
   * asked with `locale=pt`; anything untranslated stays in English, its fallback.
   */
  readonly portuguese: Readonly<
    Record<string, { readonly title?: string; readonly headline?: string }>
  > = {
    'story melencolia-i': { title: 'O anjo que não age' },
    'curation durer-and-the-occult': { title: 'Dürer e o oculto' },
    'drop-page melencolia-i-numbered': {
      headline: 'Melencolia I, em cinquenta exemplares numerados',
    },
  };

  private servers: Server[] = [];
  commerceUrl = '';
  cmsUrl = '';
  storeUrl = '';

  async start(): Promise<this> {
    this.commerceUrl = await this.listen((request, response, body) => {
      this.commerce(request, response, body);
    });
    this.cmsUrl = await this.listen((request, response) => {
      this.cms(request, response);
    });
    this.storeUrl = await this.listen((request, response, body) => {
      this.store(request, response, body);
    });
    return this;
  }

  /** Saves a newer draft of a published story, as an editor typing in the CMS would. */
  draftStory(artworkSlug: string, changes: { readonly title: string }): void {
    const story = this.stories.find((candidate) => candidate.artworkSlug === artworkSlug);
    if (story === undefined) {
      throw new Error(`The fake CMS has no story about ${artworkSlug}`);
    }
    this.storyDrafts = [...this.storyDrafts, { ...story, ...changes, _status: 'draft' }];
  }

  reset(): void {
    this.requests.commerce.length = 0;
    this.requests.cms.length = 0;
    this.requests.store.length = 0;
    this.modes = { commerce: 'ok', cms: 'ok' };
    this.storeStatus = 204;
    this.shop.reset();
    this.products = fixtures.products;
    this.stories = fixtures.stories;
    this.storyDrafts = [];
    this.ignoreStatusFilter = false;
  }

  async close(): Promise<void> {
    await Promise.all(
      this.servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.closeAllConnections();
            server.close(() => {
              resolve();
            });
          }),
      ),
    );
  }

  /** The GraphQL operations commerce received, by name. */
  commerceOperations(): string[] {
    return this.requests.commerce
      .filter((request) => request.path === '/shop-api')
      .map((request) => String((request.body as { operationName?: unknown }).operationName));
  }

  private async listen(
    handle: (request: IncomingMessage, response: ServerResponse, body: unknown) => void,
  ): Promise<string> {
    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        handle(request, response, text === '' ? undefined : JSON.parse(text));
      });
    });
    this.servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  private record(
    target: RecordedRequest[],
    request: IncomingMessage,
    body: unknown,
  ): { path: string; query: URLSearchParams } {
    const url = new URL(request.url ?? '/', 'http://upstream');
    target.push({
      method: request.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams,
      headers: request.headers,
      body,
    });
    return { path: url.pathname, query: url.searchParams };
  }

  private commerce(request: IncomingMessage, response: ServerResponse, body: unknown) {
    const { path } = this.record(this.requests.commerce, request, body);
    if (path === '/health') return json(response, 200, { status: 'ok' });
    if (this.modes.commerce === 'unavailable') return json(response, 503, { error: 'down' });
    if (path === '/admin-api') return json(response, 200, { data: { echo: true } });

    const { operationName, variables } = body as {
      operationName: string;
      variables: Record<string, Record<string, unknown> | undefined>;
    };
    const sold = this.shop.answer(operationName, variables, request.headers.authorization);
    if (sold !== null) {
      return response
        .writeHead(sold.status, {
          'content-type': 'application/json',
          ...(sold.token === undefined ? {} : { 'vendure-auth-token': sold.token }),
        })
        .end(JSON.stringify(sold.body));
    }
    switch (operationName) {
      case 'ArtworkProducts': {
        const options = (variables['options'] ?? {}) as {
          skip?: number;
          take?: number;
          filter?: { slug?: { in: string[] }; id?: { in: string[] } };
        };
        if (options.filter?.slug !== undefined) {
          const slugs = options.filter.slug.in;
          const items = this.products.filter((product) => slugs.includes(product.slug));
          return json(response, 200, { data: { products: { totalItems: items.length, items } } });
        }
        if (options.filter?.id !== undefined) {
          const ids = options.filter.id.in;
          const items = this.products.filter((product) => ids.includes(product.id));
          return json(response, 200, { data: { products: { totalItems: items.length, items } } });
        }
        const sorted = [...this.products].sort((a, b) => a.name.localeCompare(b.name));
        const skip = options.skip ?? 0;
        const items = sorted.slice(skip, skip + (options.take ?? sorted.length));
        return json(response, 200, { data: { products: { totalItems: sorted.length, items } } });
      }
      case 'CollectionProductIds': {
        const input = variables['input'] as { collectionSlug: string; skip: number; take: number };
        const collection = fixtures.collections.find(
          (entry) => entry.slug === input.collectionSlug,
        );
        const ids = this.products
          .filter((product) => collection?.productIds.includes(product.id))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((product) => product.id);
        const items = ids
          .slice(input.skip, input.skip + input.take)
          .map((productId) => ({ productId }));
        return json(response, 200, { data: { search: { totalItems: ids.length, items } } });
      }
      case 'Collections':
        return json(response, 200, {
          data: {
            collections: {
              items: fixtures.collections.map(({ id, slug, name }) => ({ id, slug, name })),
            },
          },
        });
      case 'CollectionBySlug': {
        const slug = (variables as { slug?: string }).slug;
        const found = fixtures.collections.find((entry) => entry.slug === slug);
        return json(response, 200, {
          data: {
            collection:
              found === undefined ? null : { id: found.id, slug: found.slug, name: found.name },
          },
        });
      }
      default:
        // Vendure answers a GraphQL error with a 400 and an `errors` body.
        return json(response, 400, {
          errors: [
            {
              message: `Unknown operation ${operationName}`,
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            },
          ],
        });
    }
  }

  private cms(request: IncomingMessage, response: ServerResponse) {
    const { path, query } = this.record(this.requests.cms, request, undefined);
    if (path === '/api/health') return json(response, 200, { status: 'ok' });
    if (this.modes.cms === 'unavailable')
      return json(response, 503, { errors: [{ message: 'down' }] });
    if (request.headers.authorization !== `users API-Key ${CMS_TEST_API_KEY}`) {
      return json(response, 403, {
        errors: [{ message: 'You are not allowed to perform this action.' }],
      });
    }

    // Like Payload for the gateway's user: drafts too, unless the query filters them out.
    const status = this.ignoreStatusFilter ? null : query.get('where[_status][equals]');
    const inPortuguese = query.get('locale') === 'pt';
    const translated = <T extends object>(key: string, doc: T): T =>
      inPortuguese ? { ...doc, ...this.portuguese[key] } : doc;
    const limit = Number(query.get('limit') ?? 10);
    if (path === '/api/stories') {
      const slugs = (query.get('where[artworkSlug][in]') ?? '').split(',');
      const newest =
        query.get('draft') === 'true'
          ? this.stories.map(
              (story) =>
                this.storyDrafts.find((draft) => draft.artworkSlug === story.artworkSlug) ?? story,
            )
          : this.stories;
      const docs = newest
        .filter(
          (story) =>
            slugs.includes(story.artworkSlug) && (status === null || story._status === status),
        )
        .map((story) => translated(`story ${story.artworkSlug}`, story));
      return json(response, 200, payloadList(docs.slice(0, limit)));
    }
    if (path === '/api/drop-pages') {
      const slugs = (query.get('where[slug][in]') ?? '').split(',');
      const docs = fixtures.dropPages
        .filter((page) => slugs.includes(page.slug) && (status === null || page._status === status))
        .map((page) => translated(`drop-page ${page.slug}`, page));
      return json(response, 200, payloadList(docs.slice(0, limit)));
    }
    if (path === '/api/curations') {
      const slug = query.get('where[slug][equals]');
      const docs = fixtures.curations
        .filter((curation) => slug === null || curation.slug === slug)
        .filter((curation) => status === null || curation._status === status)
        .map((curation) => translated(`curation ${curation.slug}`, curation))
        .sort((a, b) => a.title.localeCompare(b.title));
      return json(response, 200, payloadList(docs.slice(0, limit)));
    }
    return json(response, 404, { errors: [{ message: 'Not Found' }] });
  }

  private store(request: IncomingMessage, response: ServerResponse, body: unknown) {
    this.record(this.requests.store, request, body);
    response.writeHead(this.storeStatus).end();
  }
}

function payloadList(docs: unknown[]) {
  return {
    docs,
    totalDocs: docs.length,
    limit: 10,
    totalPages: 1,
    page: 1,
    hasPrevPage: false,
    hasNextPage: false,
  };
}

/** Answers with `body` as JSON; returns the ended response so a handler can `return json(...)`. */
function json(response: ServerResponse, status: number, body: unknown): ServerResponse {
  return response
    .writeHead(status, { 'content-type': 'application/json' })
    .end(JSON.stringify(body));
}
