import { z } from 'zod';

const httpUrl = z.url({ protocol: /^https?$/, error: 'must be an http(s) URL' });

/**
 * HMAC keys, API keys and bearer secrets. 32 characters is the floor every Deckle
 * service holds a shared secret to, so a pair never passes on one side only.
 */
const secret = z.string().min(32, { error: 'must be at least 32 characters' });

/** Compose passes an unset optional variable through as an empty string. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

/** The browser's origin: CSRF and WebSocket checks compare it with `Origin`, which has no path. */
const origin = httpUrl
  .refine((value) => {
    const url = new URL(value);
    return url.pathname === '/' && url.search === '' && url.hash === '';
  }, 'must be an origin, without a path')
  .transform((value) => new URL(value).origin);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'must be a postgres:// URL' }),
  PUBLIC_ORIGIN: origin,
  COMMERCE_SHOP_API_URL: httpUrl,
  COMMERCE_ADMIN_API_URL: httpUrl,
  COMMERCE_API_KEY: secret,
  CMS_API_URL: httpUrl,
  CMS_API_KEY: secret,
  COMMERCE_HOOK_SECRET: secret,
  CMS_HOOK_SECRET: secret,
  // Optional until the store exists: without it the gateway logs what it would revalidate.
  STORE_REVALIDATE_URL: optional(httpUrl),
  STORE_REVALIDATE_SECRET: secret,
});

/**
 * The validated environment. Inject it as `ConfigService<Env, true>`, so
 * `get(key, { infer: true })` returns the parsed type; an alias would hide the
 * class from the decorator metadata Nest injects by.
 */
export type Env = z.output<typeof envSchema>;
