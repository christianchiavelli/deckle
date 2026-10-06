import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  type CmsEvent,
  type CommerceEvent,
  cmsEventSchema,
  commerceEventSchema,
} from './hook-events.js';
import { HookSignatureGuard, SignedBy } from './hook-signature.guard.js';
import { HooksService } from './hooks.service.js';

/** Change notifications from commerce and the CMS. Never routed by Caddy: only the services post here. */
@Controller('hooks')
@UseGuards(HookSignatureGuard)
export class HooksController {
  constructor(private readonly hooks: HooksService) {}

  @Post('commerce')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SignedBy('commerce')
  async commerce(@Body({ schema: commerceEventSchema }) event: CommerceEvent): Promise<void> {
    await this.hooks.handle(event);
  }

  @Post('cms')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SignedBy('cms')
  async cms(@Body({ schema: cmsEventSchema }) event: CmsEvent): Promise<void> {
    await this.hooks.handle(event);
  }
}
