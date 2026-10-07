import { ApolloServerErrorCode } from '@apollo/server/errors';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { GraphQLError } from 'graphql';
import { z } from 'zod';

/** A device's answer is a few kilobytes at most; anything larger is not one. */
export const MAX_RESPONSE_LENGTH = 32_768;

const base64url = z.string().regex(/^[A-Za-z0-9_-]*$/, 'must be base64url');

/**
 * The shape of `navigator.credentials` answers, as `@simplewebauthn/browser`
 * serialises them. Checked before SimpleWebAuthn reads them, which then checks
 * every byte; unknown fields stay, since newer browsers add some.
 */
const registrationResponse = z
  .object({
    id: base64url.min(1),
    rawId: base64url.min(1),
    type: z.literal('public-key'),
    response: z
      .object({
        clientDataJSON: base64url,
        attestationObject: base64url,
        transports: z.array(z.string().max(32)).max(8).optional(),
      })
      .loose(),
    clientExtensionResults: z.record(z.string(), z.unknown()),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
  })
  .loose();

const authenticationResponse = z
  .object({
    id: base64url.min(1),
    rawId: base64url.min(1),
    type: z.literal('public-key'),
    response: z
      .object({
        clientDataJSON: base64url,
        authenticatorData: base64url,
        signature: base64url,
        userHandle: base64url.optional(),
      })
      .loose(),
    clientExtensionResults: z.record(z.string(), z.unknown()),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
  })
  .loose();

/** The argument arrives as the JSON the browser library made; this reads it, or says why not. */
function parse(json: string, schema: z.ZodType, what: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw badInput(`${what} is not JSON`);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw badInput(`${what} is not a passkey answer: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT } });

export const parseRegistration = (json: string) =>
  parse(json, registrationResponse, 'The new passkey') as RegistrationResponseJSON;

export const parseAuthentication = (json: string) =>
  parse(json, authenticationResponse, 'The passkey') as AuthenticationResponseJSON;
