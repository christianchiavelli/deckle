import type { INestApplicationContext } from '@nestjs/common';
import {
  ApiKeyService,
  ChannelService,
  LanguageCode,
  Permission,
  RoleService,
  type RequestContext,
} from '@vendure/core';
import { splitApiKey } from '../auth/api-keys.js';

/**
 * What the gateway may do on the Admin API, and nothing more: read the catalogue, and
 * update products and their variants (stock and new variants for drops).
 */
export const GATEWAY_ROLE = {
  code: 'deckle-gateway',
  description: 'The Deckle gateway: reads the catalogue, adjusts variants and stock for drops',
  permissions: [Permission.ReadCatalog, Permission.UpdateProduct],
} as const;

export const GATEWAY_API_KEY_NAME = 'Deckle gateway';

export type ApiKeyOutcome = 'created' | 'rotated' | 'replaced' | 'unchanged';

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

/**
 * Makes sure the Admin API key in `GATEWAY_API_KEY` exists with the gateway's role.
 * Expects the context's app to run `ProvisionedApiKeyStrategy`, which makes Vendure's
 * own `create` and `rotate` store that value instead of a random one.
 */
export async function seedGatewayApiKey(
  app: INestApplicationContext,
  ctx: RequestContext,
  apiKey: string,
): Promise<ApiKeyOutcome> {
  const roleService = app.get(RoleService);
  const permissions = [...GATEWAY_ROLE.permissions];
  let role = (await roleService.findAll(ctx, { filter: { code: { eq: GATEWAY_ROLE.code } } }))
    .items[0];
  if (!role) {
    const channel = await app.get(ChannelService).getDefaultChannel(ctx);
    role = await roleService.create(ctx, {
      code: GATEWAY_ROLE.code,
      description: GATEWAY_ROLE.description,
      permissions,
      channelIds: [channel.id],
    });
  } else if (!sameSet(role.permissions, permissions)) {
    role = await roleService.update(ctx, { id: role.id, permissions });
  }

  const apiKeyService = app.get(ApiKeyService);
  const strategy = apiKeyService.getApiKeyStrategyByApiType('admin');
  const { lookupId } = splitApiKey(apiKey);
  const current = await apiKeyService.findOneByLookupId(ctx, lookupId);
  if (current) {
    if (await strategy.hashingStrategy.check(apiKey, current.apiKeyHash)) {
      return 'unchanged';
    }
    // Same lookup id, new secret: the environment's value changed, so the stored one goes.
    await apiKeyService.rotate(ctx, current.id);
    return 'rotated';
  }

  // A gateway key under another lookup id is a value the environment no longer holds.
  const stale = (await apiKeyService.findAll(ctx, { take: 1000 })).items.filter(
    (key) => key.name === GATEWAY_API_KEY_NAME,
  );
  for (const key of stale) {
    await apiKeyService.softDelete(ctx, key.id);
  }
  const ownerId = ctx.activeUserId;
  if (ownerId === undefined) {
    throw new Error('The gateway API key needs an owner; seed as the superadmin');
  }
  await apiKeyService.create(
    ctx,
    {
      roleIds: [role.id],
      translations: [{ languageCode: LanguageCode.en, name: GATEWAY_API_KEY_NAME }],
    },
    ownerId,
  );
  return stale.length > 0 ? 'replaced' : 'created';
}
