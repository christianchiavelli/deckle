import type { IncomingMessage } from 'node:http';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  type RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../config/env.js';
import { SIGNATURE_HEADER, verifySignature } from './signature.js';

export type HookSender = 'commerce' | 'cms';

/** Names which sender's secret signs the requests a route receives. */
export const SignedBy = Reflector.createDecorator<HookSender>();

/**
 * Lets a webhook through only when its signature verifies against the raw body.
 * It runs before the body is validated, so an unsigned request learns nothing
 * about what a valid body looks like.
 */
@Injectable()
export class HookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(HookSignatureGuard.name);
  private readonly secrets: Readonly<Record<HookSender, string>>;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService<Env, true>,
  ) {
    this.secrets = {
      commerce: config.get('COMMERCE_HOOK_SECRET', { infer: true }),
      cms: config.get('CMS_HOOK_SECRET', { infer: true }),
    };
  }

  canActivate(context: ExecutionContext): boolean {
    const sender = this.reflector.get(SignedBy, context.getHandler());
    const request = context.switchToHttp().getRequest<RawBodyRequest<IncomingMessage>>();
    const check = verifySignature({
      header: request.headers[SIGNATURE_HEADER],
      rawBody: request.rawBody,
      secret: this.secrets[sender],
      nowSeconds: Date.now() / 1000,
    });
    if (!check.valid) {
      this.logger.warn(`Refused a ${sender} webhook: signature ${check.reason}`);
      throw new UnauthorizedException('The Deckle-Signature header is missing, stale or wrong');
    }
    return true;
  }
}
