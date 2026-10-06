import {
  ExternalAuthenticationService,
  UnverifiedExternalEmailError,
  type AuthenticationStrategy,
  type Injector,
  type RequestContext,
  type User,
} from '@vendure/core';
import { parse, type DocumentNode } from 'graphql';
import type { GatewayTokenVerifier } from './gateway-token.js';

export const DECKLE_STRATEGY_NAME = 'deckle';

export interface DeckleAuthData {
  token: string;
}

/**
 * Vendure needs an email address for every customer, and a passkey sign-in may not
 * have one yet. `.invalid` is reserved (RFC 2606) for names that must never resolve,
 * so the placeholder can never reach a real inbox.
 */
export function placeholderEmail(userId: string): string {
  return `${userId}@users.deckle.invalid`;
}

/**
 * `authenticate(input: { deckle: { token } })` on the Shop API: the gateway vouches
 * for a Deckle user with a token it signed, and gets back a Vendure session for the
 * Customer behind that user, created on first sight.
 *
 * A strategy rather than a plugin: Vendure takes strategies in `authOptions`, and
 * listing them there keeps the Shop API's whole sign-in surface in one place.
 */
export class DeckleAuthenticationStrategy implements AuthenticationStrategy<DeckleAuthData> {
  readonly name = DECKLE_STRATEGY_NAME;
  private externalAuthentication: ExternalAuthenticationService | undefined;

  constructor(private readonly verifier: GatewayTokenVerifier) {}

  init(injector: Injector): void {
    this.externalAuthentication = injector.get(ExternalAuthenticationService);
  }

  defineInputType(): DocumentNode {
    return parse(`
      input DeckleAuthInput {
        "The short-lived token the gateway signed for this customer"
        token: String!
      }
    `);
  }

  async authenticate(ctx: RequestContext, data: DeckleAuthData): Promise<User | string> {
    const externalAuthentication = this.externalAuthentication;
    if (!externalAuthentication) {
      throw new Error('The deckle authentication strategy was used before Vendure initialised it');
    }
    const check = await this.verifier.verify(data.token);
    if (!check.ok) {
      return check.reason;
    }
    const { userId, email } = check.identity;

    const known = await externalAuthentication.findCustomerUser(ctx, this.name, userId);
    if (known) {
      return known;
    }
    try {
      return await externalAuthentication.createCustomerAndUser(ctx, {
        strategy: this.name,
        externalIdentifier: userId,
        emailAddress: email ?? placeholderEmail(userId),
        // Vendure's Customer requires names; the gateway owns them and never reads these.
        firstName: '',
        lastName: '',
        // The token says who the user is, not that they own the email address, so an
        // existing account with that address is never taken over (Vendure 3.7 refuses
        // to link it unless this is true).
        verified: false,
      });
    } catch (error) {
      if (error instanceof UnverifiedExternalEmailError) {
        return 'Another account already uses this email address';
      }
      throw error;
    }
  }
}
