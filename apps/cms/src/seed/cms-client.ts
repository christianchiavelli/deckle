import { z } from 'zod';
import { roles } from '../access/policy';

/**
 * Just enough of Payload's REST API for the seed, which runs against a live
 * CMS like any other client: through the same access control and the same
 * hooks, so seeded stories reach the gateway as events too.
 */

const userSchema = z.object({ id: z.number(), email: z.string(), role: z.enum(roles) });
const sessionSchema = z.object({ token: z.string().min(1), user: userSchema });
const docSchema = z.object({ id: z.number() });

export type CmsUser = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;

/** Payload answers errors as `{ errors: [{ message }] }`. */
const errorBodySchema = z.object({ errors: z.array(z.object({ message: z.string() })).min(1) });

export class CmsApiError extends Error {
  override readonly name = 'CmsApiError';

  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    detail: string,
  ) {
    super(`${method} ${path} answered ${status}: ${detail}`);
  }
}

export class CmsUnreachableError extends Error {
  override readonly name = 'CmsUnreachableError';

  constructor(url: URL, options?: ErrorOptions) {
    super(`Nothing answered at ${url.origin}: is the CMS running and healthy?`, options);
  }
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

type Collection = 'users' | 'stories' | 'curations' | 'drop-pages';

interface RequestOptions {
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string>>;
  /** `JWT <token>` for a signed-in user, `users API-Key <key>` for an API key. */
  readonly authorization?: string;
}

export type CmsClient = ReturnType<typeof createCmsClient>;

export function createCmsClient(apiUrl: string, send: typeof fetch = fetch) {
  const base = apiUrl.replace(/\/+$/, '');

  async function request<T>(
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    { body, query, authorization }: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) {
      url.searchParams.set(name, value);
    }
    const headers = new Headers({ accept: 'application/json' });
    if (body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    if (authorization) {
      headers.set('authorization', authorization);
    }
    let response: Response;
    try {
      response = await send(url, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      throw new CmsUnreachableError(url, { cause: error });
    }
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorBodySchema.safeParse(json);
      const detail = parsed.success
        ? parsed.data.errors.map((error) => error.message).join('; ')
        : response.statusText;
      throw new CmsApiError(method, path, response.status, detail);
    }
    return schema.parse(json);
  }

  const asUser = (session: Session) => `JWT ${session.token}`;

  /** `where[<field>][equals]=<value>` in Payload's query-string syntax. */
  const whereEquals = (field: string, value: string) => ({ [`where[${field}][equals]`]: value });

  return {
    /** Whether any user exists yet. */
    async isInitialised(): Promise<boolean> {
      const { initialized } = await request(
        z.object({ initialized: z.boolean() }),
        'GET',
        '/users/init',
      );
      return initialized;
    },

    /** Creates the very first user; Payload refuses once any user exists. */
    registerFirstUser(credentials: Credentials, role: CmsUser['role']): Promise<Session> {
      return request(sessionSchema, 'POST', '/users/first-register', {
        body: { ...credentials, role },
      });
    },

    login(credentials: Credentials): Promise<Session> {
      return request(sessionSchema, 'POST', '/users/login', { body: credentials });
    },

    async logout(session: Session): Promise<void> {
      await request(z.unknown(), 'POST', '/users/logout', { authorization: asUser(session) });
    },

    /** Who an API key signs in as, or `null` when it signs in as nobody. */
    async whoHasApiKey(apiKey: string): Promise<CmsUser | null> {
      const { user } = await request(
        z.object({ user: userSchema.nullable() }),
        'GET',
        '/users/me',
        {
          authorization: `users API-Key ${apiKey}`,
        },
      );
      return user;
    },

    /**
     * The id of the document whose `field` equals `value`, drafts included, so
     * a story an editor has started is never created a second time.
     */
    async findIdBy(
      session: Session,
      collection: Collection,
      field: string,
      value: string,
    ): Promise<number | null> {
      const { docs } = await request(
        z.object({ docs: z.array(docSchema) }),
        'GET',
        `/${collection}`,
        {
          authorization: asUser(session),
          query: { ...whereEquals(field, value), limit: '1', depth: '0', draft: 'true' },
        },
      );
      return docs[0]?.id ?? null;
    },

    async create(session: Session, collection: Collection, data: object): Promise<number> {
      const { doc } = await request(z.object({ doc: docSchema }), 'POST', `/${collection}`, {
        authorization: asUser(session),
        query: { depth: '0' },
        body: data,
      });
      return doc.id;
    },

    /** Changes a document; its localized fields in `locale`, or in the default locale without one. */
    async update(
      session: Session,
      collection: Collection,
      id: number,
      data: object,
      locale?: string,
    ): Promise<void> {
      await request(z.object({ doc: docSchema }), 'PATCH', `/${collection}/${String(id)}`, {
        authorization: asUser(session),
        query: { depth: '0', ...(locale === undefined ? {} : { locale }) },
        body: data,
      });
    },

    /**
     * A document as an editor reads it in `locale`, its newest version, draft or
     * not, with no fallback: a field nobody has translated reads null.
     */
    readInLocale(
      session: Session,
      collection: Collection,
      id: number,
      locale: string,
    ): Promise<
      Readonly<Record<string, unknown>> & { readonly _status?: 'draft' | 'published' | null }
    > {
      return request(
        z.looseObject({ _status: z.enum(['draft', 'published']).nullish() }),
        'GET',
        `/${collection}/${String(id)}`,
        {
          authorization: asUser(session),
          query: { locale, 'fallback-locale': 'none', draft: 'true', depth: '0' },
        },
      );
    },
  };
}
