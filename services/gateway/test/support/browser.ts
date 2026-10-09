import { graphql, type GraphQLResponse } from './graphql.js';
import type { TestApp } from './test-app.js';

/** The session cookie as the gateway names it over plain HTTP. */
export const SESSION_COOKIE = 'deckle_session';

/** One `Set-Cookie` line, read as a browser would. */
export interface SetCookie {
  readonly name: string;
  readonly value: string;
  readonly attributes: ReadonlyMap<string, string>;
}

export function parseSetCookie(line: string): SetCookie {
  const [pair = '', ...rest] = line.split(';').map((part) => part.trim());
  const at = pair.indexOf('=');
  return {
    name: pair.slice(0, at),
    value: pair.slice(at + 1),
    attributes: new Map(
      rest.map((attribute) => {
        const [key = '', value = ''] = attribute.split('=');
        return [key.toLowerCase(), value];
      }),
    ),
  };
}

/**
 * A browser talking to the gateway: it keeps the session cookie the gateway
 * sets, sends it back, and forgets it when told to, as Caddy's one origin lets
 * a real browser do.
 */
export class Browser {
  private cookie: string | null = null;
  /** The `Set-Cookie` lines of the last answer. */
  lastSetCookies: SetCookie[] = [];

  constructor(private readonly gateway: TestApp) {}

  /** The session cookie's value, if the browser holds one. */
  get session(): string | null {
    return this.cookie;
  }

  async graphql<TData = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<GraphQLResponse<TData>> {
    const response = await graphql<TData>(this.gateway, query, variables, {
      ...headers,
      ...(this.cookie === null ? {} : { cookie: `${SESSION_COOKIE}=${this.cookie}` }),
    });
    const header: unknown = (response.headers as Record<string, unknown>)['set-cookie'];
    const lines = Array.isArray(header)
      ? header.filter((line): line is string => typeof line === 'string')
      : typeof header === 'string'
        ? [header]
        : [];
    this.lastSetCookies = lines.map(parseSetCookie);
    for (const set of this.lastSetCookies) {
      if (set.name !== SESSION_COOKIE) continue;
      this.cookie = set.attributes.get('max-age') === '0' || set.value === '' ? null : set.value;
    }
    return response;
  }

  /** Sends a cookie of the browser's own making, as a tampered or stale one would be. */
  holdCookie(value: string | null): void {
    this.cookie = value;
  }
}
