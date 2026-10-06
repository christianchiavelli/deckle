import { Controller, Get, Header } from '@nestjs/common';
import { SigningKeys } from './signing-keys.service.js';

/** The gateway's public keys, for commerce to verify the tokens it signs. Internal: Caddy never routes here. */
@Controller('internal')
export class JwksController {
  constructor(private readonly keys: SigningKeys) {}

  @Get('jwks.json')
  @Header('Content-Type', 'application/jwk-set+json')
  // Short enough that a verifier sees a newly published key well before it signs anything.
  @Header('Cache-Control', 'public, max-age=300')
  jwks() {
    return this.keys.jwks();
  }
}
