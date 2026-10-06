import type { BeforeApplicationShutdown, OnApplicationBootstrap } from '@nestjs/common';
import {
  EventBus,
  LanguageCode,
  PluginCommonModule,
  VendurePlugin,
  type Type,
} from '@vendure/core';
import { catalogueEventTypes, changesFromEvent, type CatalogueEvent } from './catalogue-changes.js';
import { CatalogueHooksService } from './catalogue-hooks.service.js';
import { CatalogueChangeResolver } from './change-resolver.js';
import { CATALOGUE_HOOKS_OPTIONS, type CatalogueHooksOptions } from './options.js';

export interface CatalogueHooksInitOptions {
  readonly hookUrl: URL;
  readonly secret: string;
  readonly languageCode?: LanguageCode;
  readonly coalesce?: Partial<CatalogueHooksOptions['coalesce']>;
  readonly delivery?: Partial<CatalogueHooksOptions['delivery']>;
}

/**
 * Tells the gateway when what the store shows has changed: products, variants,
 * prices, stock, collections and assets, as signed webhooks (see `hook-contract.ts`).
 *
 * Every process that loads the plugin listens: the server sees admin edits, the
 * worker sees collection filters being applied, the seed sees its own writes.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    CatalogueChangeResolver,
    CatalogueHooksService,
    { provide: CATALOGUE_HOOKS_OPTIONS, useFactory: () => CatalogueHooksPlugin.options },
  ],
  exports: [CatalogueHooksService],
  compatibility: '^3.7.4',
})
export class CatalogueHooksPlugin implements OnApplicationBootstrap, BeforeApplicationShutdown {
  static options: CatalogueHooksOptions;

  private subscriptions: { unsubscribe(): void }[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly hooks: CatalogueHooksService,
  ) {}

  static init(options: CatalogueHooksInitOptions): Type<CatalogueHooksPlugin> {
    CatalogueHooksPlugin.options = {
      hookUrl: options.hookUrl,
      secret: options.secret,
      languageCode: options.languageCode ?? LanguageCode.en,
      coalesce: {
        // An admin save emits a handful of events within milliseconds; a second of quiet
        // gathers them without making the store wait noticeably for its new data.
        quietMs: 1_000,
        maxWaitMs: 5_000,
        settleMs: 300,
        ...options.coalesce,
      },
      delivery: { timeoutMs: 5_000, retries: 12, ...options.delivery },
    };
    return CatalogueHooksPlugin;
  }

  onApplicationBootstrap(): void {
    const { languageCode } = CatalogueHooksPlugin.options;
    this.subscriptions = catalogueEventTypes.map((type) =>
      this.eventBus.ofType<CatalogueEvent>(type).subscribe((event) => {
        this.hooks.record(changesFromEvent(event, languageCode));
      }),
    );
  }

  /** Hands the changes still in memory to the queue before the database goes away. */
  async beforeApplicationShutdown(): Promise<void> {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    await this.hooks.flush();
  }
}
