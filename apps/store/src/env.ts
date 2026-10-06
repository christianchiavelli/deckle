import { z } from 'zod';

/**
 * The store reads its environment through this schema and refuses to start on
 * a value it cannot use. The secret has no default here: compose gives it a
 * local-only value, and anything else must set it on purpose.
 */

/** Says "is not set" for a missing variable, and `message` for a bad one. */
const unlessMissing =
  (message: string) =>
  (issue: { input?: unknown }): string =>
    issue.input === undefined ? 'is not set' : message;

export const storeEnvSchema = z.object({
  /** The gateway's GraphQL endpoint, on Docker's network: the server reads it there. */
  GATEWAY_URL: z.url({ protocol: /^https?$/, error: unlessMissing('must be an http(s) URL') }),
  /** What the gateway sends as a bearer token when it asks for cache tags to be dropped. */
  STORE_REVALIDATE_SECRET: z
    .string({ error: unlessMissing('must be text') })
    .min(32, 'must be at least 32 characters'),
});

export type StoreEnv = z.infer<typeof storeEnvSchema>;

type Source = Readonly<Record<string, string | undefined>>;

export class InvalidEnvironmentError extends Error {
  override readonly name = 'InvalidEnvironmentError';

  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

/** Parses `source`, naming each bad variable without echoing its value. */
export function parseStoreEnv(source: Source): StoreEnv {
  const result = storeEnvSchema.safeParse(source);
  if (!result.success) {
    throw new InvalidEnvironmentError(
      result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`),
    );
  }
  return result.data;
}
