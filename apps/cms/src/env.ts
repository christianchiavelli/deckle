import { z } from 'zod';

/**
 * The CMS reads its environment once, through these schemas, and refuses to
 * start on a value it cannot use. Secrets have no default here: compose gives
 * them local-only values, and anything else must set them on purpose.
 */

/** Says "is not set" for a missing variable, and `message` for a bad one. */
const unlessMissing =
  (message: string) =>
  (issue: { input?: unknown }): string =>
    issue.input === undefined ? 'is not set' : message;

// 32 characters is the floor for an HMAC key or an encryption secret.
const secret = z
  .string({ error: unlessMissing('must be text') })
  .min(32, 'must be at least 32 characters');

const httpUrl = z.url({ protocol: /^https?$/, error: unlessMissing('must be an http(s) URL') });

const port = z.coerce
  .number({ error: unlessMissing('must be a port number') })
  .int()
  .min(1)
  .max(65_535)
  .default(3000);

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url({
    protocol: /^postgres(?:ql)?$/,
    error: unlessMissing('must be a postgres:// URL'),
  }),
  PORT: port,
  PAYLOAD_SECRET: secret,
  GATEWAY_HOOK_URL: httpUrl,
  HOOK_SECRET: secret,
  STORE_PREVIEW_URL: httpUrl,
  PREVIEW_SECRET: secret,
});

/** The seed talks to a running CMS, so it needs only the port and what it creates. */
export const seedEnvSchema = z.object({
  PORT: port,
  ADMIN_EMAIL: z.email({ error: unlessMissing('must be an email address') }),
  ADMIN_PASSWORD: z
    .string({ error: unlessMissing('must be text') })
    .min(12, 'must be at least 12 characters'),
  GATEWAY_API_KEY: secret,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type SeedEnv = z.infer<typeof seedEnvSchema>;

type Source = Readonly<Record<string, string | undefined>>;

export class InvalidEnvironmentError extends Error {
  override readonly name = 'InvalidEnvironmentError';

  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

/** Parses `source` against `schema`, naming each bad variable without echoing its value. */
export function parseEnv<T extends z.ZodType>(schema: T, source: Source): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new InvalidEnvironmentError(
      result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`),
    );
  }
  return result.data;
}

/**
 * The environment the Payload config is built from. `next build` evaluates the
 * config while it collects route data, on a machine that has no runtime
 * secrets and never serves a request; in that phase alone the values pass
 * through unchecked, and the server checks them when it starts.
 */
export function configEnv(source: Source = process.env): ServerEnv {
  if (source['NEXT_PHASE'] !== 'phase-production-build') {
    return parseEnv(serverEnvSchema, source);
  }
  return {
    DATABASE_URL: source['DATABASE_URL'] ?? '',
    PORT: Number(source['PORT'] ?? 3000),
    PAYLOAD_SECRET: source['PAYLOAD_SECRET'] ?? '',
    GATEWAY_HOOK_URL: source['GATEWAY_HOOK_URL'] ?? '',
    HOOK_SECRET: source['HOOK_SECRET'] ?? '',
    STORE_PREVIEW_URL: source['STORE_PREVIEW_URL'] ?? '',
    PREVIEW_SECRET: source['PREVIEW_SECRET'] ?? '',
  };
}
