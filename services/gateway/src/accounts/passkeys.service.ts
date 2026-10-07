import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { Env } from '../config/env.js';
import { refusal } from '../graphql/refusal.js';
import type { RequestSession } from '../sessions/sessions.service.js';
import { AccountStore } from './account-store.js';

/** What the browser shows as the site a passkey belongs to. */
const RP_NAME = 'Deckle';

/** How long a device may take to answer: the browser's prompt times out with it. */
export const CEREMONY_TIMEOUT_MS = 5 * 60 * 1000;

/** A UUID's sixteen bytes, as WebAuthn wants a user handle: opaque, and no personal data. */
const handleOf = (userId: string) =>
  Uint8Array.from(Buffer.from(userId.replaceAll('-', ''), 'hex'));

/**
 * Passkeys, the only way into a Deckle account. Making one creates the account;
 * using one signs it in. Each ceremony's challenge is kept for the browser that
 * asked, used once and only within five minutes, and the device must verify its
 * owner (face, finger or PIN), so the passkey alone is not enough.
 */
@Injectable()
export class Passkeys {
  private readonly origin: string;
  private readonly rpID: string;

  constructor(
    private readonly store: AccountStore,
    config: ConfigService<Env, true>,
  ) {
    this.origin = config.get('PUBLIC_ORIGIN', { infer: true });
    this.rpID = new URL(this.origin).hostname;
  }

  async registrationOptions(
    session: RequestSession,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const { id: sessionId } = await session.ensure();
    const userId = randomUUID();
    // No name, no email: the label only tells this passkey apart in the device's list.
    const label = `Deckle collector ${userId.slice(0, 4).toUpperCase()}`;
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: this.rpID,
      userID: handleOf(userId),
      userName: label,
      userDisplayName: label,
      attestationType: 'none',
      // A discoverable credential: signing in later needs no username.
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      timeout: CEREMONY_TIMEOUT_MS,
    });
    await this.store.beginCeremony(
      sessionId,
      { purpose: 'register', challenge: options.challenge, userId },
      this.deadline(),
    );
    return options;
  }

  /** Checks the new passkey, creates its account and signs it in. Returns the account's id. */
  async register(session: RequestSession, response: RegistrationResponseJSON): Promise<string> {
    const ceremony = await this.take(session, 'register');
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: true,
    }).catch((error: unknown) => {
      throw rejected(error);
    });
    if (!verification.verified) throw rejected();
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const userId = ceremony.userId;
    await this.store.createAccount({
      id: credential.id,
      userId,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    });
    await session.signIn(userId);
    return userId;
  }

  async signInOptions(session: RequestSession): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const { id: sessionId } = await session.ensure();
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      // Empty: the device offers whichever of its Deckle passkeys its owner picks.
      allowCredentials: [],
      userVerification: 'required',
      timeout: CEREMONY_TIMEOUT_MS,
    });
    await this.store.beginCeremony(
      sessionId,
      { purpose: 'sign-in', challenge: options.challenge, userId: null },
      this.deadline(),
    );
    return options;
  }

  /** Checks the passkey's signature and signs its account in. Returns the account's id. */
  async signIn(session: RequestSession, response: AuthenticationResponseJSON): Promise<string> {
    const ceremony = await this.take(session, 'sign-in');
    const passkey = await this.store.findPasskey(response.id);
    if (passkey === null) {
      throw refusal('PASSKEY_REJECTED', 'This passkey belongs to no Deckle account');
    }
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: passkey.counter,
        transports: [...passkey.transports],
      },
      requireUserVerification: true,
    }).catch((error: unknown) => {
      throw rejected(error);
    });
    if (!verification.verified) throw rejected();
    await this.store.usedPasskey(passkey.id, verification.authenticationInfo.newCounter);
    await session.signIn(passkey.userId);
    return passkey.userId;
  }

  private async take<P extends 'register' | 'sign-in'>(session: RequestSession, purpose: P) {
    const current = await session.current();
    const ceremony = current === null ? null : await this.store.takeCeremony(current.id);
    if (ceremony?.purpose !== purpose) {
      throw refusal('NO_CEREMONY', 'Start again: this browser has no passkey request waiting');
    }
    return ceremony as Extract<typeof ceremony, { purpose: P }>;
  }

  private deadline(): Date {
    return new Date(Date.now() + CEREMONY_TIMEOUT_MS);
  }
}

function rejected(cause?: unknown) {
  const detail = cause instanceof Error ? `: ${cause.message}` : '';
  return refusal('PASSKEY_REJECTED', `The device's answer did not prove the passkey${detail}`);
}
