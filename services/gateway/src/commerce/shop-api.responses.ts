import { PAPER_SIZE_ORDER } from '@deckle/print-sizes';
import { z } from 'zod';
import { optionalInt, optionalText, requiredText } from '../upstream/text.js';

const id = z.string().min(1);

/**
 * The dimensions custom field holds one line per measurement (plate, sheet...).
 * Commerce may declare it as a string list or as one text with a line per entry;
 * both read the same.
 */
const dimensionLines = z
  .union([z.array(z.string()), z.string()])
  .nullish()
  .transform((value) => {
    const lines = typeof value === 'string' ? value.split(/\r?\n/) : (value ?? []);
    return lines.map((line) => line.trim()).filter((line) => line !== '');
  });

export const shopVariantSchema = z.object({
  id,
  sku: requiredText,
  /** Minor units, taxes included. */
  priceWithTax: z.int().nonnegative(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  customFields: z.object({ paperSize: optionalText }),
});

export const shopProductSchema = z.object({
  id,
  slug: z.string().min(1),
  /** The short title the shop shows. */
  name: requiredText,
  featuredAsset: z
    .object({ source: z.url(), width: z.int().positive(), height: z.int().positive() })
    .nullable(),
  variants: z.array(shopVariantSchema),
  // How commerce files the product: artist, technique, century and the like.
  facetValues: z.array(z.object({ name: requiredText, facet: z.object({ code: z.string() }) })),
  customFields: z.object({
    metObjectId: z.int().positive(),
    fullTitle: requiredText,
    artistName: optionalText,
    artistBio: optionalText,
    artistNationality: optionalText,
    artistBeginYear: optionalInt,
    artistEndYear: optionalInt,
    objectDate: optionalText,
    objectBeginYear: optionalInt,
    medium: optionalText,
    dimensions: dimensionLines,
    classification: optionalText,
    department: optionalText,
    culture: optionalText,
    period: optionalText,
    creditLine: optionalText,
    accessionNumber: optionalText,
    objectUrl: z.url(),
    // The original scan's size: what print sizes are worked out from.
    scanWidth: z.int().positive(),
    scanHeight: z.int().positive(),
  }),
});

export const productListSchema = z.object({
  products: z.object({
    totalItems: z.int().nonnegative(),
    items: z.array(shopProductSchema),
  }),
});

export const collectionProductIdsSchema = z.object({
  search: z.object({
    totalItems: z.int().nonnegative(),
    items: z.array(z.object({ productId: id })),
  }),
});

export const shopCollectionSchema = z.object({ id, slug: z.string().min(1), name: requiredText });

export const collectionsSchema = z.object({
  collections: z.object({ items: z.array(shopCollectionSchema) }),
});

export const collectionBySlugSchema = z.object({ collection: shopCollectionSchema.nullable() });

export const editionsSchema = z.object({
  products: z.object({
    items: z.array(
      z.object({
        slug: z.string().min(1),
        variants: z.array(
          z.object({
            id,
            /** Minor units, taxes included. */
            priceWithTax: z.int().nonnegative(),
            currencyCode: z.string().regex(/^[A-Z]{3}$/),
            customFields: z.object({
              paperSize: z.enum(PAPER_SIZE_ORDER).nullable(),
              editionSize: z.int().positive().nullable(),
            }),
          }),
        ),
      }),
    ),
  }),
});

export type ShopProduct = z.output<typeof shopProductSchema>;
export type ShopVariant = z.output<typeof shopVariantSchema>;
export type ShopCollection = z.output<typeof shopCollectionSchema>;
