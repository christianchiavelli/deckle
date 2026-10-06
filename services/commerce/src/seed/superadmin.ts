import type { INestApplicationContext } from '@nestjs/common';
import {
  ConfigService,
  RequestContextService,
  TransactionalConnection,
  User,
  type RequestContext,
} from '@vendure/core';

/**
 * A context acting as the superadmin in the default channel, as Vendure's guide to
 * stand-alone scripts does it. The roles and their channels must be loaded, or the
 * context carries the user's id without any of its permissions.
 */
export async function superadminContext(app: INestApplicationContext): Promise<RequestContext> {
  const { identifier } = app.get(ConfigService).authOptions.superadminCredentials;
  const user = await app
    .get(TransactionalConnection)
    .rawConnection.getRepository(User)
    .findOneOrFail({ where: { identifier }, relations: { roles: { channels: true } } });
  return app.get(RequestContextService).create({ apiType: 'admin', user });
}
