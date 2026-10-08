import { useApolloClient } from '@apollo/client/react';
import type { PasskeyStep } from '@deckle/ui';
import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { useState } from 'react';
import { z } from 'zod/mini';
import {
  FinishPasskeyRegistrationDocument,
  FinishPasskeySignInDocument,
  StartPasskeyRegistrationDocument,
  StartPasskeySignInDocument,
} from './generated';

/** What the gateway hands over for the device, checked for the one field every ceremony needs. */
const options = z.looseObject({ challenge: z.string().check(z.minLength(16)) });

/** The options as SimpleWebAuthn's server half in the gateway made them: the rest is its own shape. */
const creationOf = (json: string | undefined) =>
  options.parse(JSON.parse(json ?? 'null')) as unknown as PublicKeyCredentialCreationOptionsJSON;

const requestOf = (json: string | undefined) =>
  options.parse(JSON.parse(json ?? 'null')) as unknown as PublicKeyCredentialRequestOptionsJSON;

export type PasskeyWay = 'use' | 'make';

export interface Passkeys {
  readonly step: PasskeyStep;
  /** The browser has no WebAuthn at all, which no retry will change. */
  readonly unsupported: boolean;
  /** Signs in with a passkey this device keeps, or makes one: true once the account is in. */
  readonly sign: (way: PasskeyWay) => Promise<boolean>;
  readonly reset: () => void;
}

/**
 * The two ceremonies, each a round trip to the gateway around the device's own
 * prompt. Once in, every query on the page is asked again: the header, the
 * drop and the account all read the session the gateway just signed in.
 */
export function usePasskeys(): Passkeys {
  const client = useApolloClient();
  const [step, setStep] = useState<PasskeyStep>('ask');
  const [unsupported, setUnsupported] = useState(false);

  async function sign(way: PasskeyWay): Promise<boolean> {
    if (!browserSupportsWebAuthn()) {
      setUnsupported(true);
      setStep('failed');
      return false;
    }
    setStep('waiting');
    try {
      if (way === 'make') {
        const started = await client.mutate({ mutation: StartPasskeyRegistrationDocument });
        const response = await startRegistration({
          optionsJSON: creationOf(started.data?.startPasskeyRegistration),
        });
        await client.mutate({
          mutation: FinishPasskeyRegistrationDocument,
          variables: { response: JSON.stringify(response) },
        });
      } else {
        const started = await client.mutate({ mutation: StartPasskeySignInDocument });
        const response = await startAuthentication({
          optionsJSON: requestOf(started.data?.startPasskeySignIn),
        });
        await client.mutate({
          mutation: FinishPasskeySignInDocument,
          variables: { response: JSON.stringify(response) },
        });
      }
      await client.refetchQueries({ include: 'active' });
      setStep('ask');
      return true;
    } catch {
      // The device was dismissed, had no passkey for Deckle, or the gateway refused
      // its answer: each is "try again, or make one", which the dialog says.
      setStep('failed');
      return false;
    }
  }

  return {
    step,
    unsupported,
    sign,
    reset: () => {
      setStep('ask');
    },
  };
}
