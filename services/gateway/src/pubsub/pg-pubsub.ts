import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { DATABASE, type Database, type SqlExecutor } from '../database/database.js';
import { PubSub } from './pubsub.js';
import { TopicListeners } from './topic-listeners.js';

/** One channel for every topic: replicas LISTEN once and route by topic themselves. */
export const PUBSUB_CHANNEL = 'deckle_gateway_events';

/** Postgres refuses a NOTIFY payload of 8000 bytes or more in its default build. */
export const NOTIFY_PAYLOAD_LIMIT_BYTES = 8000;

const RECONNECT_DELAY_MS = { first: 250, max: 15_000 };

const envelope = z.object({ topic: z.string(), payload: z.unknown() });

export class PayloadTooLargeError extends Error {
  override readonly name = 'PayloadTooLargeError';

  constructor(topic: string, bytes: number) {
    super(
      `An event on ${topic} is ${bytes} bytes; NOTIFY carries less than ${NOTIFY_PAYLOAD_LIMIT_BYTES}. Publish an id and read the rest.`,
    );
  }
}

/**
 * Pub/sub over Postgres LISTEN/NOTIFY, so an event published by one replica
 * reaches subscribers on all of them. Publishing is a plain `pg_notify`, which
 * Postgres holds back until the publishing transaction commits. Receiving needs
 * a connection of its own that stays open, so it has one, re-established with
 * backoff when it drops. NOTIFY keeps nothing: an event sent while a replica is
 * reconnecting does not reach that replica's subscribers.
 */
@Injectable()
export class PgPubSub extends PubSub implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PgPubSub.name);
  private readonly listeners = new TopicListeners();
  private readonly connectionString: string;
  private listener: pg.Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private stopped = false;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    config: ConfigService<Env, true>,
  ) {
    super();
    this.connectionString = config.get('DATABASE_URL', { infer: true });
  }

  async onModuleInit() {
    await this.listen();
  }

  async publish(topic: string, payload: unknown, executor: SqlExecutor = this.db): Promise<void> {
    const message = JSON.stringify({ topic, payload });
    const bytes = Buffer.byteLength(message, 'utf8');
    if (bytes >= NOTIFY_PAYLOAD_LIMIT_BYTES) throw new PayloadTooLargeError(topic, bytes);
    await executor.execute(sql`select pg_notify(${PUBSUB_CHANNEL}, ${message})`);
  }

  subscribe<T>(topic: string, payload: z.ZodType<T>): AsyncIterableIterator<T> {
    return this.listeners.subscribe(topic, payload);
  }

  isListening(): boolean {
    return this.listener !== null;
  }

  async onApplicationShutdown() {
    this.stopped = true;
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    const listener = this.listener;
    this.listener = null;
    await listener?.end();
  }

  private async listen(): Promise<void> {
    const client = new pg.Client({
      connectionString: this.connectionString,
      application_name: 'deckle-gateway-listener',
      keepAlive: true,
    });
    client.on('notification', (notification) => {
      if (notification.channel === PUBSUB_CHANNEL) this.dispatch(notification.payload);
    });
    client.on('error', (error) => {
      this.lost(client, error);
    });
    client.on('end', () => {
      this.lost(client);
    });

    try {
      await client.connect();
      await client.query(`LISTEN ${PUBSUB_CHANNEL}`);
    } catch (error) {
      silence(client);
      await client.end().catch(() => undefined);
      throw error;
    }
    this.listener = client;
    if (this.reconnectAttempts > 0) {
      this.logger.log(`Listening for events again after ${this.reconnectAttempts} attempt(s)`);
    }
    this.reconnectAttempts = 0;
  }

  private dispatch(raw: string | undefined) {
    let message: unknown;
    try {
      message = JSON.parse(raw ?? '');
    } catch {
      this.logger.warn('Dropped a notification that is not JSON');
      return;
    }
    const parsed = envelope.safeParse(message);
    if (parsed.success) {
      this.listeners.deliver(parsed.data.topic, parsed.data.payload);
    } else {
      this.logger.warn('Dropped a notification without a topic');
    }
  }

  private lost(client: pg.Client, error?: Error) {
    // `end` follows `error`, and a replaced client may still report: act once, on the live one.
    if (this.stopped || client !== this.listener) return;
    this.listener = null;
    silence(client);
    client.end().catch(() => undefined);
    this.logger.warn(
      `Lost the event listener connection${error === undefined ? '' : `: ${error.message}`}; reconnecting`,
    );
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    const ceiling = Math.min(
      RECONNECT_DELAY_MS.max,
      RECONNECT_DELAY_MS.first * 2 ** this.reconnectAttempts,
    );
    // Jitter keeps the replicas from reconnecting in lockstep after a database restart.
    const delay = ceiling / 2 + Math.random() * (ceiling / 2);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.listen().catch((error: unknown) => {
        this.logger.warn(
          `Reconnecting the event listener failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.scheduleReconnect();
      });
    }, delay);
  }
}

/** Detaches a discarded client, keeping a no-op `error` handler: an unheard one would crash the process. */
function silence(client: pg.Client) {
  client.removeAllListeners();
  client.on('error', () => undefined);
}
