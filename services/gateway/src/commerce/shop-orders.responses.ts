import { z } from 'zod';
import { optionalText } from '../upstream/text.js';

const id = z.string().min(1);
/** Minor units, taxes included. */
const amount = z.int().nonnegative();

export const shopOrderLineSchema = z.object({
  id,
  quantity: z.int().positive(),
  unitPriceWithTax: amount,
  linePriceWithTax: amount,
  productVariant: z.object({
    id,
    sku: z.string().min(1),
    customFields: z.object({
      paperSize: optionalText,
      editionSize: z.int().positive().nullable(),
    }),
    product: z.object({ slug: z.string().min(1) }),
  }),
});

export const shopOrderSchema = z.object({
  id,
  code: z.string().min(1),
  state: z.string().min(1),
  active: z.boolean(),
  orderPlacedAt: z.iso.datetime({ offset: true }).nullable(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  totalQuantity: z.int().nonnegative(),
  subTotalWithTax: amount,
  shippingWithTax: amount,
  totalWithTax: amount,
  customFields: z
    .object({
      copyNumber: z.int().positive().nullable(),
      receiptEmail: optionalText,
    })
    .nullable(),
  customer: z.object({ emailAddress: z.string() }).nullable(),
  shippingAddress: z
    .object({
      fullName: optionalText,
      streetLine1: optionalText,
      streetLine2: optionalText,
      city: optionalText,
      postalCode: optionalText,
      countryCode: optionalText,
      country: optionalText,
    })
    .nullable(),
  shippingLines: z.array(
    z.object({ priceWithTax: amount, shippingMethod: z.object({ code: z.string() }) }),
  ),
  lines: z.array(shopOrderLineSchema),
});

/** Vendure's answer instead of an order: an `ErrorResult`, with its code. */
export const refusalSchema = z.object({
  __typename: z.string(),
  errorCode: z.string(),
  message: z.string(),
  quantityAvailable: z.int().optional(),
});

/** One of the order mutations' unions: the order, or the reason it was refused. */
export const orderOrRefusal = z.union([
  shopOrderSchema.extend({ __typename: z.literal('Order') }),
  refusalSchema,
]);

export const activeOrderSchema = z.object({ activeOrder: shopOrderSchema.nullable() });
export const orderByCodeSchema = z.object({ orderByCode: shopOrderSchema.nullable() });

export const eligibleShippingSchema = z.object({
  eligibleShippingMethods: z.array(z.object({ id, code: z.string() })),
});

export const authenticationSchema = z.object({
  authenticate: z.union([z.object({ __typename: z.literal('CurrentUser'), id }), refusalSchema]),
});

export const logOutSchema = z.object({ logout: z.object({ success: z.boolean() }) });

export const countriesSchema = z.object({
  availableCountries: z.array(z.object({ code: z.string().length(2), name: z.string().min(1) })),
});

export type ShopOrder = z.output<typeof shopOrderSchema>;
export type ShopOrderLine = z.output<typeof shopOrderLineSchema>;
export type Refusal = z.output<typeof refusalSchema>;
