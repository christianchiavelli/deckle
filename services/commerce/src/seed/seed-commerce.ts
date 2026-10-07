import { DROPS, type DropDefinition } from '@deckle/drops';
import type { Catalog } from '@deckle/met';
import type { INestApplicationContext } from '@nestjs/common';
import { CatalogueSeeder, type CatalogueSeedReport } from './seed-catalogue.js';
import { seedGatewayApiKey, type ApiKeyOutcome } from './seed-gateway-api-key.js';
import { seedShop, type ShopSeedReport } from './seed-shop.js';
import { superadminContext } from './superadmin.js';

export interface SeedReport {
  shop: Omit<ShopSeedReport, 'taxCategoryId'>;
  catalogue: CatalogueSeedReport;
  gatewayApiKey: ApiKeyOutcome;
}

export interface SeedInput {
  readonly catalog: Catalog;
  /** Where `catalog.json` was read, with the images under `images/`. */
  readonly catalogDir: string;
  /** `GATEWAY_API_KEY`. */
  readonly gatewayApiKey: string;
  /** The drops whose numbered editions commerce sells; by default, the ones the stack opens with. */
  readonly drops?: readonly DropDefinition[];
}

/**
 * Everything the shop needs to sell the data set, created through Vendure's own
 * services so that events, the search index and collection contents follow as they
 * do for an editor. Idempotent: what exists is left as it is.
 */
export async function seedCommerce(
  app: INestApplicationContext,
  input: SeedInput,
): Promise<SeedReport> {
  const { taxCategoryId, ...shop } = await seedShop(app, await superadminContext(app));
  // A fresh context: the channel's zones and tax setting may have just changed.
  const ctx = await superadminContext(app);
  const catalogue = await new CatalogueSeeder(app, ctx, taxCategoryId).seed(
    input.catalog,
    input.catalogDir,
    input.drops ?? DROPS,
  );
  const gatewayApiKey = await seedGatewayApiKey(app, ctx, input.gatewayApiKey);
  return { shop, catalogue, gatewayApiKey };
}

/** True when the run created or changed nothing. */
export function isNoOp(report: SeedReport): boolean {
  const { shop, catalogue, gatewayApiKey } = report;
  return (
    shop.countriesCreated === 0 &&
    [
      shop.zone,
      shop.channel,
      shop.taxCategory,
      shop.taxRate,
      shop.shippingMethod,
      shop.paymentMethod,
    ].every((outcome) => outcome === 'unchanged') &&
    catalogue.facetsCreated === 0 &&
    catalogue.facetValuesCreated === 0 &&
    catalogue.productsCreated === 0 &&
    catalogue.collectionsCreated === 0 &&
    catalogue.editionsCreated === 0 &&
    gatewayApiKey === 'unchanged'
  );
}
