import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CommerceTokenSigner } from './commerce-token.signer.js';
import { JwksController } from './jwks.controller.js';
import { PgSigningKeyStore, SigningKeyStore } from './signing-key.store.js';
import { SigningKeys } from './signing-keys.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [JwksController],
  providers: [
    SigningKeys,
    CommerceTokenSigner,
    { provide: SigningKeyStore, useClass: PgSigningKeyStore },
  ],
  exports: [CommerceTokenSigner],
})
export class IdentityModule {}
