import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { type CookieSerializeOptions, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { parseCookieHeader } from '@nestjs/core/helpers/cookies/parse-cookie-header.js';
import type { Env } from '../config/env.js';
import type { SessionChanges, SessionRecord } from './session-store.js';
import { SessionStore } from './session-store.js';

/** How long a session lasts without being seen. Each visit, at most daily, pushes it back. */
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

/** 32 random bytes, base64url: what the cookie carries, and nothing else. */
const SECRET_SHAPE = /^[A-Za-z0-9_-]{43}$/;

const hashOf = (secret: string) => createHash('sha256').update(secret).digest('base64url');

/** Sets and clears the session cookie on the response under way. */
export interface CookieWriter {
  set(secret: string): void;
  clear(): void;
}

type SessionFields = Omit<SessionRecord, 'id' | 'expiresAt'>;

/**
 * The session of one request: read once, from its cookie, and made only when
 * something needs to be kept, such as a first print in the cart. A sign-in or a
 * sign-out swaps it for a new one, so a session id seen before never signs anyone in.
 */
export class RequestSession {
  private loaded: Promise<SessionRecord | null> | undefined;
  private started: Promise<SessionRecord> | undefined;

  constructor(
    private readonly sessions: Sessions,
    private readonly secret: string | undefined,
    private readonly cookies: CookieWriter | null,
  ) {}

  /** The session the cookie names, if it is live. Never makes one. */
  current(): Promise<SessionRecord | null> {
    this.loaded ??= this.sessions.load(this.secret, this.cookies);
    return this.loaded;
  }

  /** The session, made now and its cookie set if there was none. */
  ensure(): Promise<SessionRecord> {
    this.started ??= this.current().then(
      (current) =>
        current ?? this.restart(null, { userId: null, cartToken: null, customerToken: null }),
    );
    return this.started;
  }

  async update(changes: SessionChanges): Promise<SessionRecord> {
    const current = await this.ensure();
    await this.sessions.update(current.id, changes);
    return this.remember({ ...current, ...changes });
  }

  /** Signs an account in on this browser, keeping its cart. */
  async signIn(userId: string): Promise<SessionRecord> {
    const current = await this.current();
    return this.restart(current?.id ?? null, {
      userId,
      cartToken: current?.cartToken ?? null,
      customerToken: null,
    });
  }

  /** Signs out, keeping the cart, which was the browser's before anyone signed in. */
  async signOut(): Promise<SessionRecord | null> {
    const current = await this.current();
    const signedIn = current?.userId ?? null;
    if (current === null || signedIn === null) return current;
    return this.restart(current.id, {
      userId: null,
      cartToken: current.cartToken,
      customerToken: null,
    });
  }

  private async restart(oldId: string | null, fields: SessionFields): Promise<SessionRecord> {
    if (this.cookies === null) {
      throw new Error('A subscription cannot start a session: it has no response to set it on');
    }
    return this.remember(await this.sessions.start(oldId, fields, this.cookies));
  }

  private remember(session: SessionRecord): SessionRecord {
    this.loaded = Promise.resolve(session);
    this.started = Promise.resolve(session);
    return session;
  }
}

@Injectable()
export class Sessions {
  /** `__Host-` binds the cookie to this origin, but browsers accept it over HTTPS only. */
  readonly cookieName: string;
  private readonly cookieOptions: CookieSerializeOptions;

  constructor(
    private readonly store: SessionStore,
    private readonly adapterHost: HttpAdapterHost,
    config: ConfigService<Env, true>,
  ) {
    const secure = new URL(config.get('PUBLIC_ORIGIN', { infer: true })).protocol === 'https:';
    this.cookieName = secure ? '__Host-deckle_session' : 'deckle_session';
    this.cookieOptions = {
      path: '/',
      httpOnly: true,
      secure,
      // Sent on a link followed from elsewhere, such as an order email; never on a
      // cross-site form post, which the CSRF check refuses anyway.
      sameSite: 'lax',
      maxAge: SESSION_LIFETIME_MS / 1000,
    };
  }

  /** The session of an HTTP request, which may set its cookie on the response. */
  forHttp(request: IncomingMessage, response: unknown): RequestSession {
    const adapter = this.adapterHost.httpAdapter;
    return new RequestSession(this, this.secretIn(request), {
      set: (secret) => {
        adapter.setCookie(response, this.cookieName, secret, this.cookieOptions);
      },
      clear: () => {
        adapter.clearCookie(response, this.cookieName, {
          path: this.cookieOptions.path,
          secure: this.cookieOptions.secure,
        });
      },
    });
  }

  /** The session behind a subscription's WebSocket, read-only: an upgrade has no response to set a cookie on. */
  forSubscription(request: IncomingMessage | undefined): RequestSession {
    return new RequestSession(this, request && this.secretIn(request), null);
  }

  async load(
    secret: string | undefined,
    cookies: CookieWriter | null,
  ): Promise<SessionRecord | null> {
    if (secret === undefined) return null;
    if (!SECRET_SHAPE.test(secret)) {
      cookies?.clear();
      return null;
    }
    const now = Date.now();
    const found = await this.store.find(hashOf(secret), {
      until: new Date(now + SESSION_LIFETIME_MS),
      ifSeenBefore: new Date(now - RENEW_AFTER_MS),
    });
    if (found === null) {
      // Expired, signed out elsewhere or never ours: the browser can forget it.
      cookies?.clear();
      return null;
    }
    if (found.renewed) cookies?.set(secret);
    return found.session;
  }

  async start(
    oldId: string | null,
    fields: SessionFields,
    cookies: CookieWriter,
  ): Promise<SessionRecord> {
    const secret = randomBytes(32).toString('base64url');
    const session: SessionRecord = {
      id: hashOf(secret),
      ...fields,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    };
    await this.store.replace(oldId, session);
    cookies.set(secret);
    return session;
  }

  update(id: string, changes: SessionChanges): Promise<void> {
    return this.store.update(id, changes);
  }

  private secretIn(request: IncomingMessage): string | undefined {
    return parseCookieHeader(request.headers.cookie)[this.cookieName];
  }
}
