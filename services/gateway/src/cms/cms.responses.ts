import { z } from 'zod';
import { optionalText, requiredText } from '../upstream/text.js';

/**
 * The CMS documents the gateway reads, as Payload's REST API returns them with
 * `depth=0`. The rich text body stays opaque here: the Lexical mapper reads it.
 */

const documentId = z.union([z.string().min(1), z.int()]).transform(String);
const timestamp = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

/** Payload's draft state on a collection with drafts; null where a collection has none. */
const publicationStatus = z
  .enum(['draft', 'published'])
  .nullish()
  .transform((status) => status ?? null);

/** A number the editor may leave empty, as null whether Payload sends null or nothing. */
const optionalNumber = (min: number, max: number) =>
  z
    .number()
    .min(min)
    .max(max)
    .nullish()
    .transform((value) => value ?? null);

/**
 * What the story shows up close, and the words for it. Payload sends the group
 * with every field null when the editor left it empty; a detail missing a part
 * of its point is no detail. Its words may still be missing, as in a story
 * written before the work's page showed the detail.
 */
const storyDetail = z
  .object({
    x: optionalNumber(0, 100),
    y: optionalNumber(0, 100),
    zoom: optionalNumber(1, 8),
    alt: optionalText,
    caption: optionalText,
  })
  .nullish()
  .transform((detail) => {
    if (!detail) return null;
    const { x, y, zoom, alt, caption } = detail;
    return x === null || y === null || zoom === null ? null : { x, y, zoom, alt, caption };
  });

export const cmsStorySchema = z.object({
  id: documentId,
  // Unique in the CMS: a work has one story at most, and a story has no address of its own.
  artworkSlug: z.string().min(1),
  title: requiredText,
  lede: optionalText,
  detail: storyDetail,
  body: z.unknown(),
  sources: z
    .array(z.object({ label: requiredText, url: optionalText }))
    .nullish()
    .transform((sources) => sources ?? []),
  updatedAt: timestamp,
  _status: publicationStatus,
});

export const cmsCurationSchema = z.object({
  id: documentId,
  slug: z.string().min(1),
  title: requiredText,
  intro: optionalText,
  // A `text` field with `hasMany`: artwork slugs, in the order the editor set.
  artworks: z
    .array(z.string().min(1))
    .nullish()
    .transform((slugs) => slugs ?? []),
  updatedAt: timestamp,
  _status: publicationStatus,
});

/** The words on a drop's page. The drop's dates, copies and price are not the CMS's. */
export const cmsDropPageSchema = z.object({
  id: documentId,
  slug: z.string().min(1),
  artworkSlug: z.string().min(1),
  headline: requiredText,
  body: z.unknown(),
  updatedAt: timestamp,
  _status: publicationStatus,
});

/** Payload's paginated list envelope; only `docs` matters to the gateway. */
export const payloadList = <T extends z.ZodType>(document: T) =>
  z.object({ docs: z.array(document) });

export type CmsStory = z.output<typeof cmsStorySchema>;
export type CmsCuration = z.output<typeof cmsCurationSchema>;
export type CmsDropPage = z.output<typeof cmsDropPageSchema>;
