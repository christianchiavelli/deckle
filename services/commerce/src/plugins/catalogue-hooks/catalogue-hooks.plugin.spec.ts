import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  LanguageCode,
  Logger,
  Product,
  ProductEvent,
  ProductTranslation,
  ProductVariant,
  ProductVariantPriceEvent,
  ProductVariantPrice,
  RequestContext,
  type EventBus,
  type JobQueueService,
} from '@vendure/core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CatalogueChange } from './catalogue-changes.js';
import { CatalogueHooksPlugin } from './catalogue-hooks.plugin.js';
import { CatalogueHooksService } from './catalogue-hooks.service.js';
import type { CatalogueChangeResolver } from './change-resolver.js';
import type { ResolvedChange } from './coalesce.js';
import { signatureHeader, type CatalogueHookBody } from './hook-contract.js';
import { CATALOGUE_HOOKS_QUEUE } from './options.js';

/** Just enough of Vendure's EventBus: `ofType` and a way to publish. */
class FakeEventBus {
  private readonly listeners = new Set<{
    type: abstract new (...args: never[]) => unknown;
    handler: (event: unknown) => void;
  }>();

  ofType(type: abstract new (...args: never[]) => unknown) {
    return {
      subscribe: (handler: (event: unknown) => void) => {
        const listener = { type, handler };
        this.listeners.add(listener);
        return { unsubscribe: () => this.listeners.delete(listener) };
      },
    };
  }

  publish(event: object): void {
    for (const listener of this.listeners) {
      if (event instanceof listener.type) {
        listener.handler(event);
      }
    }
  }

  get subscribers(): number {
    return this.listeners.size;
  }
}

interface QueuedJob {
  data: CatalogueHookBody;
  options: { retries?: number } | undefined;
}

/** A job queue that records what is added and lets the test run the processor. */
function fakeJobQueues() {
  const added: QueuedJob[] = [];
  let processJob: ((job: { data: CatalogueHookBody }) => Promise<unknown>) | undefined;
  let queueName: string | undefined;
  const service = {
    createQueue: (definition: {
      name: string;
      process: (job: { data: CatalogueHookBody }) => Promise<unknown>;
    }) => {
      queueName = definition.name;
      processJob = definition.process;
      return Promise.resolve({
        add: (data: CatalogueHookBody, options?: { retries?: number }) => {
          added.push({ data, options });
          return Promise.resolve();
        },
      });
    },
  };
  return {
    service: service as unknown as JobQueueService,
    added,
    name: () => queueName,
    process: (data: CatalogueHookBody) => {
      if (!processJob) {
        throw new Error('no queue created');
      }
      return processJob({ data });
    },
  };
}

/** Resolves ids the way the real resolver would, from a fixed table instead of the database. */
const resolver = {
  resolve: (changes: readonly CatalogueChange[]): Promise<ResolvedChange[]> =>
    Promise.resolve(
      changes.flatMap((change): ResolvedChange[] => {
        if (change.kind === 'product') {
          return [
            {
              type: 'product',
              action: change.action,
              at: change.at,
              productId: String(change.productId),
              slug: change.slug ?? 'unknown',
            },
          ];
        }
        if (change.kind === 'variants') {
          return [
            {
              type: change.type,
              action: change.action,
              at: change.at,
              productId: '3',
              slug: 'melencolia-i',
              variantIds: ['7'],
            },
          ];
        }
        return [];
      }),
    ),
} as unknown as CatalogueChangeResolver;

const ctx = RequestContext.empty();
const product = new Product({
  id: 3,
  translations: [new ProductTranslation({ languageCode: LanguageCode.en, slug: 'melencolia-i' })],
});
const price = new ProductVariantPrice({
  id: 20,
  variant: new ProductVariant({ id: 7, productId: 3 }),
});

describe('CatalogueHooksPlugin', () => {
  const requests: { signature: string | undefined; raw: string }[] = [];
  let status = 204;
  const receiver = createServer((request, response) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => (raw += chunk));
    request.on('end', () => {
      const header = request.headers['deckle-signature'];
      requests.push({ signature: typeof header === 'string' ? header : undefined, raw });
      response.statusCode = status;
      response.end();
    });
  });
  let hookUrl: URL;

  beforeAll(async () => {
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
    hookUrl = new URL(
      `http://127.0.0.1:${(receiver.address() as AddressInfo).port}/hooks/commerce`,
    );
  });

  afterAll(async () => {
    await new Promise((resolve) => receiver.close(resolve));
  });

  async function setUp() {
    CatalogueHooksPlugin.init({
      hookUrl,
      secret: 'a-shared-hook-secret',
      coalesce: { quietMs: 5, maxWaitMs: 50, settleMs: 10 },
      delivery: { retries: 3 },
    });
    const bus = new FakeEventBus();
    const queues = fakeJobQueues();
    const hooks = new CatalogueHooksService(queues.service, resolver, CatalogueHooksPlugin.options);
    await hooks.onModuleInit();
    const plugin = new CatalogueHooksPlugin(bus as unknown as EventBus, hooks);
    plugin.onApplicationBootstrap();
    return { bus, queues, hooks, plugin };
  }

  it('fills in the defaults the config leaves out', () => {
    CatalogueHooksPlugin.init({
      hookUrl: new URL('http://gateway:4000/hooks/commerce'),
      secret: 'a-shared-hook-secret',
    });
    expect(CatalogueHooksPlugin.options).toMatchObject({
      languageCode: LanguageCode.en,
      coalesce: { quietMs: 1_000, maxWaitMs: 5_000, settleMs: 300 },
      delivery: { timeoutMs: 5_000, retries: 12 },
    });
  });

  it('turns a burst of events into coalesced jobs, each with its own id', async () => {
    const { bus, queues, hooks } = await setUp();
    expect(queues.name()).toBe(CATALOGUE_HOOKS_QUEUE);

    bus.publish(new ProductEvent(ctx, product, 'updated'));
    bus.publish(new ProductEvent(ctx, product, 'updated'));
    bus.publish(new ProductVariantPriceEvent(ctx, [price], 'updated'));
    await hooks.drain();

    expect(queues.added.map(({ data }) => `${data.type} ${data.action}`)).toEqual([
      'product updated',
      'price updated',
    ]);
    expect(queues.added.every(({ options }) => options?.retries === 3)).toBe(true);
    const ids = queues.added.map(({ data }) => data.id);
    expect(new Set(ids).size).toBe(2);
    expect(queues.added[0]?.data).toMatchObject({
      source: 'commerce',
      subject: { productId: '3', slug: 'melencolia-i' },
    });
  });

  it('delivers a queued job signed, and reports a refusal without retrying', async () => {
    const { bus, queues, hooks } = await setUp();
    bus.publish(new ProductEvent(ctx, product, 'deleted'));
    await hooks.drain();
    const [job] = queues.added;
    if (!job) {
      throw new Error('nothing was queued');
    }

    requests.length = 0;
    status = 204;
    await expect(queues.process(job.data)).resolves.toEqual({ kind: 'delivered', status: 204 });
    const [request] = requests;
    const timestamp = Number(/^t=(\d+),/.exec(request?.signature ?? '')?.[1]);
    expect(request?.signature).toBe(
      signatureHeader('a-shared-hook-secret', request?.raw ?? '', timestamp),
    );
    expect(JSON.parse(request?.raw ?? '')).toEqual(job.data);

    const errors = vi.spyOn(Logger, 'error').mockImplementation(() => undefined);
    status = 422;
    await expect(queues.process(job.data)).resolves.toEqual({ kind: 'rejected', status: 422 });
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('refused hook'), 'CatalogueHooks');
    errors.mockRestore();
  });

  it('stops listening on shutdown and hands over what is still buffered', async () => {
    const { bus, queues, plugin } = await setUp();
    expect(bus.subscribers).toBeGreaterThan(0);
    bus.publish(new ProductEvent(ctx, product, 'updated'));
    await plugin.beforeApplicationShutdown();
    expect(bus.subscribers).toBe(0);
    expect(queues.added).toHaveLength(1);
  });

  it('logs a batch it could not enqueue instead of failing the event', async () => {
    const queues = fakeJobQueues();
    const hooks = new CatalogueHooksService(queues.service, resolver, CatalogueHooksPlugin.options);
    const errors = vi.spyOn(Logger, 'error').mockImplementation(() => undefined);
    hooks.record([
      { kind: 'product', action: 'updated', at: new Date(), productId: 3, slug: 'melencolia-i' },
    ]);
    await hooks.flush();
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining('Lost 1 catalogue changes'),
      'CatalogueHooks',
      expect.any(String),
    );
    errors.mockRestore();
  });
});
