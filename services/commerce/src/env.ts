import { z } from 'zod';

/**
 * Everything commerce reads from its environment. The server, the worker and the
 * seed share one image and one schema, so a bad value stops all three the same way.
 * Secrets have no defaults here: compose gives local-only ones, code never does.
 */

const port = z.coerce.number().int().min(1).max(65_535);
const httpUrl = z.url({ protocol: /^https?$/ });
const secret = z.string().min(16, 'is too short to be a secret (16 characters at least)');

/**
 * The Admin API key the gateway presents, in Vendure's `<lookupId>:<secret>` form.
 * The lookup id is stored in clear to find the key; only the secret part carries
 * entropy, and a colon inside it would be cut off by Vendure's parser.
 */
export const apiKeySchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]{8,64}:[A-Za-z0-9_-]{32,256}$/,
    'must be "<lookup id>:<secret>", 8 to 64 and 32 to 256 characters of [A-Za-z0-9_-]',
  );

export const commerceEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PORT: port.default(3000),
  SUPERADMIN_USERNAME: z.string().trim().min(1),
  // Vendure 3.7 refuses its own default password in production; refusing it here too
  // keeps the worker and the seed from starting with it either.
  SUPERADMIN_PASSWORD: z
    .string()
    .min(12, 'needs 12 characters at least')
    .refine((value) => value !== 'superadmin', 'must not be the Vendure default'),
  // The browser loads assets through Caddy, so the prefix is the public origin plus
  // `/assets/`; Vendure appends the asset path to it as is.
  ASSET_URL_PREFIX: httpUrl.refine((value) => value.endsWith('/'), 'must end with a slash'),
  GATEWAY_JWKS_URL: httpUrl,
  GATEWAY_HOOK_URL: httpUrl,
  HOOK_SECRET: secret,
  GATEWAY_API_KEY: apiKeySchema,
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: port,
  // Vendure reads this variable itself (core/src/telemetry/helpers/is-telemetry-disabled.helper.ts);
  // requiring it makes "telemetry on" a configuration error instead of a default.
  VENDURE_DISABLE_TELEMETRY: z.literal('true', {
    error: 'must be "true": Deckle never sends telemetry',
  }),
  // Read by the seed alone: "true" adds the demo trade, invented customers and their
  // orders, after the catalogue. Compose turns it on; DECKLE_DEMO_DATA=false turns it off.
  DEMO_DATA: z.enum(['true', 'false']).default('false'),
});

export type CommerceEnv = z.infer<typeof commerceEnvSchema>;

export class InvalidEnvironmentError extends Error {
  override readonly name = 'InvalidEnvironmentError';
}

/** Parses the environment, or throws one error that names every bad variable. */
export function parseCommerceEnv(source: Record<string, string | undefined>): CommerceEnv {
  const result = commerceEnvSchema.safeParse(source);
  if (!result.success) {
    throw new InvalidEnvironmentError(
      `Commerce refuses to start with this environment:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
