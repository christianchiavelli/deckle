import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce/commerce.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AccountStore } from './account-store.js';
import { AccountsResolver } from './accounts.resolver.js';
import { Passkeys } from './passkeys.service.js';
import { PgAccountStore } from './pg-account-store.js';

@Module({
  imports: [DatabaseModule, CommerceModule],
  providers: [Passkeys, AccountsResolver, { provide: AccountStore, useClass: PgAccountStore }],
  exports: [AccountStore],
})
export class AccountsModule {}
