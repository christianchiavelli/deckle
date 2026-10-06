import type { LanguageCode } from '@vendure/core';

export const CATALOGUE_HOOKS_OPTIONS = Symbol('CATALOGUE_HOOKS_OPTIONS');

/** The job queue the hooks wait in until the worker delivers them. */
export const CATALOGUE_HOOKS_QUEUE = 'deckle-catalogue-hooks';

export interface CatalogueHooksOptions {
  /** `GATEWAY_HOOK_URL`, e.g. `http://gateway:4000/hooks/commerce`. */
  readonly hookUrl: URL;
  /** `HOOK_SECRET`, shared with the gateway, which keeps it as `COMMERCE_HOOK_SECRET`. */
  readonly secret: string;
  /** The language whose slugs the store uses in its URLs. */
  readonly languageCode: LanguageCode;
  readonly coalesce: {
    /** Flush once no event has arrived for this long. */
    readonly quietMs: number;
    /** Flush at the latest this long after the first pending event. */
    readonly maxWaitMs: number;
    /** How long `drain()` waits for the events of writes that have just committed. */
    readonly settleMs: number;
  };
  readonly delivery: {
    readonly timeoutMs: number;
    /** Attempts after the first; with the backoff in `hookBackoffMs`, about half an hour. */
    readonly retries: number;
  };
}
