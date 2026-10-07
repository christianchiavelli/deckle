import type { INestApplicationContext } from '@nestjs/common';
import {
  ChannelService,
  CountryService,
  CurrencyCode,
  dummyPaymentHandler,
  idsAreEqual,
  isGraphQlErrorResult,
  LanguageCode,
  PaymentMethodService,
  ShippingMethodService,
  TaxCategoryService,
  TaxRateService,
  ZoneService,
  type ID,
  type RequestContext,
} from '@vendure/core';
import {
  COUNTRIES,
  NUMBERED_COPY_SHIPPING,
  PAYMENT_METHOD,
  SHIPPING_METHOD,
  SHIPPING_ZONE,
  TAX_CATEGORY,
  TAX_RATE,
} from './shop-setup.js';

export type SeedOutcome = 'created' | 'updated' | 'unchanged';

export interface ShopSeedReport {
  countriesCreated: number;
  zone: SeedOutcome;
  channel: SeedOutcome;
  taxCategory: SeedOutcome;
  taxRate: SeedOutcome;
  shippingMethod: SeedOutcome;
  paymentMethod: SeedOutcome;
  /** For the variants the catalogue seed creates. */
  taxCategoryId: ID;
}

const en = LanguageCode.en;

const idOf = (entity: { id: ID } | null | undefined) => entity?.id;

/**
 * Countries, the one zone, tax, the two shipping methods, payment and the channel's
 * settings; each only if missing.
 */
export async function seedShop(
  app: INestApplicationContext,
  ctx: RequestContext,
): Promise<ShopSeedReport> {
  const countryService = app.get(CountryService);
  const known = new Map(
    (await countryService.findAll(ctx, { take: 1000 })).items.map((country) => [
      country.code,
      country,
    ]),
  );
  let countriesCreated = 0;
  for (const { code, name } of COUNTRIES) {
    if (!known.has(code)) {
      known.set(
        code,
        await countryService.create(ctx, {
          code,
          enabled: true,
          translations: [{ languageCode: en, name }],
        }),
      );
      countriesCreated++;
    }
  }
  const memberIds = COUNTRIES.flatMap(({ code }) => {
    const country = known.get(code);
    return country ? [country.id] : [];
  });

  const zoneService = app.get(ZoneService);
  let zoneOutcome: SeedOutcome = 'unchanged';
  let zone = (await zoneService.findAll(ctx, { filter: { name: { eq: SHIPPING_ZONE } } })).items[0];
  if (!zone) {
    zone = await zoneService.create(ctx, { name: SHIPPING_ZONE, memberIds });
    zoneOutcome = 'created';
  } else {
    const members = (await zoneService.findOne(ctx, zone.id))?.members ?? [];
    const missing = memberIds.filter((id) => !members.some((member) => idsAreEqual(member.id, id)));
    if (missing.length > 0) {
      await zoneService.addMembersToZone(ctx, { zoneId: zone.id, memberIds: missing });
      zoneOutcome = 'updated';
    }
  }

  const taxCategoryService = app.get(TaxCategoryService);
  let taxCategoryOutcome: SeedOutcome = 'unchanged';
  let taxCategory = (
    await taxCategoryService.findAll(ctx, { filter: { name: { eq: TAX_CATEGORY } } })
  ).items[0];
  if (!taxCategory) {
    taxCategory = await taxCategoryService.create(ctx, { name: TAX_CATEGORY, isDefault: true });
    taxCategoryOutcome = 'created';
  }

  const taxRateService = app.get(TaxRateService);
  let taxRateOutcome: SeedOutcome = 'unchanged';
  const taxRates = await taxRateService.findAll(ctx, { filter: { name: { eq: TAX_RATE.name } } });
  if (taxRates.items.length === 0) {
    await taxRateService.create(ctx, {
      name: TAX_RATE.name,
      enabled: true,
      value: TAX_RATE.percentage,
      categoryId: taxCategory.id,
      zoneId: zone.id,
    });
    taxRateOutcome = 'created';
  }

  const channelService = app.get(ChannelService);
  let channelOutcome: SeedOutcome = 'unchanged';
  const channel = await channelService.getDefaultChannel(ctx);
  const channelIsSetUp =
    channel.pricesIncludeTax &&
    channel.defaultCurrencyCode === CurrencyCode.USD &&
    idsAreEqual(idOf(channel.defaultTaxZone), zone.id) &&
    idsAreEqual(idOf(channel.defaultShippingZone), zone.id);
  if (!channelIsSetUp) {
    const updated = await channelService.update(ctx, {
      id: channel.id,
      pricesIncludeTax: true,
      defaultCurrencyCode: CurrencyCode.USD,
      availableCurrencyCodes: [CurrencyCode.USD],
      defaultTaxZoneId: zone.id,
      defaultShippingZoneId: zone.id,
    });
    if (isGraphQlErrorResult(updated)) {
      throw new Error(`Could not set up the default channel: ${updated.message}`);
    }
    channelOutcome = 'updated';
  }

  const shippingMethodService = app.get(ShippingMethodService);
  const shippingOutcomes: SeedOutcome[] = [];
  for (const method of [SHIPPING_METHOD, NUMBERED_COPY_SHIPPING]) {
    const found = await shippingMethodService.findAll(ctx, {
      filter: { code: { eq: method.code } },
    });
    if (found.items.length > 0) {
      shippingOutcomes.push('unchanged');
      continue;
    }
    await shippingMethodService.create(ctx, {
      code: method.code,
      fulfillmentHandler: 'manual-fulfillment',
      checker: { code: method.checker.code, arguments: [...method.checker.arguments] },
      calculator: {
        code: 'default-shipping-calculator',
        arguments: [
          { name: 'rate', value: String(method.price) },
          { name: 'includesTax', value: 'include' },
          { name: 'taxRate', value: String(TAX_RATE.percentage) },
        ],
      },
      translations: [{ languageCode: en, name: method.name, description: method.description }],
    });
    shippingOutcomes.push('created');
  }
  const shippingOutcome: SeedOutcome = shippingOutcomes.includes('created')
    ? 'created'
    : 'unchanged';

  const paymentMethodService = app.get(PaymentMethodService);
  let paymentOutcome: SeedOutcome = 'unchanged';
  const paymentMethods = await paymentMethodService.findAll(ctx, {
    filter: { code: { eq: PAYMENT_METHOD.code } },
  });
  if (paymentMethods.items.length === 0) {
    await paymentMethodService.create(ctx, {
      code: PAYMENT_METHOD.code,
      enabled: true,
      handler: {
        code: dummyPaymentHandler.code,
        arguments: [{ name: 'automaticSettle', value: 'true' }],
      },
      translations: [
        { languageCode: en, name: PAYMENT_METHOD.name, description: PAYMENT_METHOD.description },
      ],
    });
    paymentOutcome = 'created';
  }

  return {
    countriesCreated,
    zone: zoneOutcome,
    channel: channelOutcome,
    taxCategory: taxCategoryOutcome,
    taxRate: taxRateOutcome,
    shippingMethod: shippingOutcome,
    paymentMethod: paymentOutcome,
    taxCategoryId: taxCategory.id,
  };
}
