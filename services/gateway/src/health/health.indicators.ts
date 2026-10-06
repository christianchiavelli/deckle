import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import pg from 'pg';
import type { Env } from '../config/env.js';
import { PG_POOL } from '../database/database.js';
import { PubSub } from '../pubsub/pubsub.js';
import { sendUpstream } from '../upstream/http.js';

type CheckedUpstream = 'commerce' | 'cms';

const DATABASE_TIMEOUT_MS = 1000;
const UPSTREAM_TIMEOUT_MS = 1500;
/** Health is polled every few seconds by each replica; the upstreams need not be asked that often. */
const UPSTREAM_CACHE_MS = 10_000;

@Injectable()
export class HealthIndicators {
  private readonly upstreamHealthUrls: Readonly<Record<CheckedUpstream, string>>;
  private readonly upstreamChecks = new Map<
    CheckedUpstream,
    { readonly at: number; readonly result: Promise<HealthIndicatorResult> }
  >();

  constructor(
    private readonly indicators: HealthIndicatorService,
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly pubSub: PubSub,
    config: ConfigService<Env, true>,
  ) {
    this.upstreamHealthUrls = {
      commerce: new URL('/health', config.get('COMMERCE_SHOP_API_URL', { infer: true })).href,
      cms: `${config.get('CMS_API_URL', { infer: true }).replace(/\/+$/, '')}/health`,
    };
  }

  /** The gateway's own state lives in Postgres: without it, it cannot serve. */
  database() {
    return this.indicators
      .check('database')
      .attempt(async () => {
        await this.pool.query('select 1');
      })
      .withTimeout(DATABASE_TIMEOUT_MS);
  }

  /** Subscriptions go quiet while the listener reconnects; queries are unaffected. */
  eventListener() {
    const indicator = this.indicators.check('pubsub');
    return this.pubSub.isListening()
      ? indicator.up()
      : indicator.degraded({ message: 'reconnecting to Postgres' });
  }

  /**
   * An upstream outage degrades the gateway but does not make it unhealthy: it
   * still answers (with errors on the fields that need that upstream), and
   * commerce reads the gateway's JWKS, so a hard dependency would be circular.
   */
  upstream(service: CheckedUpstream): Promise<HealthIndicatorResult> {
    const cached = this.upstreamChecks.get(service);
    if (cached !== undefined && Date.now() - cached.at < UPSTREAM_CACHE_MS) return cached.result;
    const result = this.probe(service);
    this.upstreamChecks.set(service, { at: Date.now(), result });
    return result;
  }

  private async probe(service: CheckedUpstream): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(service);
    try {
      const response = await sendUpstream({
        service,
        url: this.upstreamHealthUrls[service],
        method: 'GET',
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        retryOnNetworkError: false,
      });
      return response.status >= 200 && response.status < 300
        ? indicator.up()
        : indicator.degraded({ message: `answered ${response.status}` });
    } catch (error) {
      return indicator.degraded({
        message: error instanceof Error ? error.message : 'unreachable',
      });
    }
  }
}
