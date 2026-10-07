import { Logger } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { z } from 'zod';
import { ShopSessionClient } from '../commerce/shop-session.client.js';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { AccountStore } from './account-store.js';
import {
  MAX_RESPONSE_LENGTH,
  parseAuthentication,
  parseRegistration,
} from './passkey-responses.js';
import { Passkeys } from './passkeys.service.js';
import { Viewer } from './viewer.model.js';

const responseArg = z
  .string()
  .max(MAX_RESPONSE_LENGTH, { error: 'response is too long to be a passkey answer' });

@Resolver(() => Viewer)
export class AccountsResolver {
  private readonly logger = new Logger(AccountsResolver.name);

  constructor(
    private readonly passkeys: Passkeys,
    private readonly accounts: AccountStore,
    private readonly shop: ShopSessionClient,
  ) {}

  @Query(() => Viewer, {
    nullable: true,
    description: 'The account signed in on this browser; null for a guest.',
  })
  async viewer(@Context() context: GatewayContext): Promise<Viewer | null> {
    const session = await context.session.current();
    return session?.userId ? this.viewerOf(session.userId) : null;
  }

  @Mutation(() => String, {
    description:
      'Starts making a passkey, which makes an account: the options for `navigator.credentials.create()`, as JSON.',
  })
  async startPasskeyRegistration(@Context() context: GatewayContext): Promise<string> {
    return JSON.stringify(await this.passkeys.registrationOptions(context.session));
  }

  @Mutation(() => Viewer, {
    description:
      'Finishes making a passkey with the JSON the device answered: the account is made and signed in.',
  })
  async finishPasskeyRegistration(
    @Args('response', { type: () => String }, new ArgsSchemaPipe(responseArg)) response: string,
    @Context() context: GatewayContext,
  ): Promise<Viewer> {
    const userId = await this.passkeys.register(context.session, parseRegistration(response));
    return this.signedIn(userId);
  }

  @Mutation(() => String, {
    description:
      'Starts signing in with a passkey: the options for `navigator.credentials.get()`, as JSON.',
  })
  async startPasskeySignIn(@Context() context: GatewayContext): Promise<string> {
    return JSON.stringify(await this.passkeys.signInOptions(context.session));
  }

  @Mutation(() => Viewer, {
    description: 'Finishes signing in with the JSON the device answered; the cart stays as it was.',
  })
  async finishPasskeySignIn(
    @Args('response', { type: () => String }, new ArgsSchemaPipe(responseArg)) response: string,
    @Context() context: GatewayContext,
  ): Promise<Viewer> {
    const userId = await this.passkeys.signIn(context.session, parseAuthentication(response));
    return this.signedIn(userId);
  }

  @Mutation(() => Boolean, {
    description: 'Signs this browser out. The cart stays: it was the browser’s, not the account’s.',
  })
  async signOut(@Context() context: GatewayContext): Promise<boolean> {
    const before = await context.session.current();
    await context.session.signOut();
    const customerToken = before?.customerToken ?? null;
    if (customerToken !== null) {
      // Commerce's session would lapse on its own; closing it now is tidier, not required.
      await this.shop.logOut(customerToken).catch((error: unknown) => {
        this.logger.warn(
          `Could not close the customer's commerce session: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    return true;
  }

  private async viewerOf(userId: string): Promise<Viewer | null> {
    const account = await this.accounts.account(userId);
    return account === null ? null : { id: account.id, since: account.createdAt };
  }

  private async signedIn(userId: string): Promise<Viewer> {
    const viewer = await this.viewerOf(userId);
    if (viewer === null) throw new Error(`Account ${userId} vanished as it signed in`);
    return viewer;
  }
}
