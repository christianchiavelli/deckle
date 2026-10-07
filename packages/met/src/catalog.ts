import { z } from 'zod';

/**
 * The data set the importer writes to `data/met`, and every service seeds from.
 * A value The Met leaves empty is `null` here, never `""` or `0`, so a reader
 * can tell "not recorded" from a real value and show a dash.
 */

const text = z.string().trim().min(1);
const year = z.int().min(-10000).max(2100);

export const artistSchema = z.object({
  name: text,
  /** As The Met words it, e.g. "German, Nuremberg 1471–1528 Nuremberg". */
  bio: text.nullable(),
  nationality: text.nullable(),
  beginYear: year.nullable(),
  endYear: year.nullable(),
});

const cropSchema = z.object({
  left: z.int().nonnegative(),
  top: z.int().nonnegative(),
  width: z.int().positive(),
  height: z.int().positive(),
});

export const imageSchema = z.object({
  /** The reduced master, relative to `data/met/images`. */
  file: z.string().regex(/^[\w.-]+\.(jpg|webp)$/),
  /** The reduced master's own size. */
  width: z.int().positive(),
  height: z.int().positive(),
  /**
   * The pixels the print is made from, read from the original's header: all of
   * it, or the crop's size where there is one. Print sizes are worked out from these.
   */
  originalWidth: z.int().positive(),
  originalHeight: z.int().positive(),
  /** The part of the original kept, where the curation cuts a grey scale away; null for all of it. */
  crop: cropSchema.nullable(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourceUrl: z.url(),
});

export const workSchema = z.object({
  objectId: z.int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  /** The Met's title, verbatim. */
  title: text,
  /** The title as the shop shows it: The Met's own, shortened by hand where it runs to a sentence. */
  shortTitle: text,
  artist: artistSchema.nullable(),
  date: z.object({
    display: text.nullable(),
    beginYear: year.nullable(),
    endYear: year.nullable(),
  }),
  medium: text.nullable(),
  /** One entry per line of The Met's dimensions, which may describe the plate, the sheet and more. */
  dimensions: z.array(text),
  classification: text.nullable(),
  department: text.nullable(),
  culture: text.nullable(),
  period: text.nullable(),
  creditLine: text.nullable(),
  accessionNumber: text.nullable(),
  objectUrl: z.url(),
  tags: z.array(text),
  image: imageSchema,
});

export const catalogSchema = z.object({
  version: z.literal(1),
  generatedAt: z.iso.datetime(),
  source: z.url(),
  works: z
    .array(workSchema)
    .refine(
      (works) => new Set(works.map((work) => work.slug)).size === works.length,
      'Every work needs a slug of its own',
    ),
});

export type Artist = z.infer<typeof artistSchema>;
export type WorkImage = z.infer<typeof imageSchema>;
export type Work = z.infer<typeof workSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
