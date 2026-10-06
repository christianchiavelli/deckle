import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { sendUpstream } from '../upstream/http.js';
import { UpstreamHttpError } from '../upstream/upstream-errors.js';
import type { Revalidation } from './hook-effects.js';

const REVALIDATE_TIMEOUT_MS = 5000;

/** Asks the store to drop the cached pages behind some cache tags. */
@Injectable()
export class StoreRevalidator {
  private readonly logger = new Logger(StoreRevalidator.name);
  private readonly url: string | undefined;
  private readonly secret: string;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('STORE_REVALIDATE_URL', { infer: true });
    this.secret = config.get('STORE_REVALIDATE_SECRET', { infer: true });
  }

  async revalidate(revalidation: Revalidation): Promise<void> {
    if (this.url === undefined) {
      this.logger.log('No store to revalidate yet: STORE_REVALIDATE_URL is not set', {
        tags: revalidation.tags,
        profile: revalidation.profile,
      });
      return;
    }
    // Not retried here: the webhook fails instead, and its sender retries with backoff.
    const response = await sendUpstream({
      service: 'store',
      url: this.url,
      method: 'POST',
      headers: { authorization: `Bearer ${this.secret}` },
      body: { tags: revalidation.tags, profile: revalidation.profile },
      timeoutMs: REVALIDATE_TIMEOUT_MS,
      retryOnNetworkError: false,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new UpstreamHttpError('store', response.status, 'revalidation was refused');
    }
  }
}
