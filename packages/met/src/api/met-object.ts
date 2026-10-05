import { z } from 'zod';

/**
 * The collection API's responses as The Met sends them, before any cleaning.
 * Text fields are always present and empty when unknown, so they are plain
 * strings here; the normaliser turns the empty ones into `null`. Only the
 * fields Deckle reads are declared: the rest are dropped, so a field The Met
 * adds tomorrow cannot break an import. See docs/upstream-api.md.
 */

/** A text field: present on every record, `""` when The Met has nothing. */
const text = z.string();

export const metConstituentSchema = z.object({
  constituentID: z.int(),
  role: text,
  name: text,
  constituentULAN_URL: text,
  constituentWikidata_URL: text,
  gender: text,
});

export const metTagSchema = z.object({
  term: text,
  AAT_URL: text.nullable(),
  Wikidata_URL: text.nullable(),
});

export const metObjectSchema = z.object({
  objectID: z.int().positive(),
  /** The authority on whether Deckle may sell a print of the work. */
  isPublicDomain: z.boolean(),
  /** The original scan, or `""` when the object has no open-access image. */
  primaryImage: text,
  /** The "web-large" rendition, about 600 px on its long edge. */
  primaryImageSmall: text,
  additionalImages: z.array(text).nullable(),
  /** `null` on some records rather than an empty array. */
  constituents: z.array(metConstituentSchema).nullable(),
  department: text,
  objectName: text,
  title: text,
  culture: text,
  period: text,
  portfolio: text,
  artistRole: text,
  /** Qualifies the attribution: "Attributed to", "After", "Issued by"… */
  artistPrefix: text,
  artistDisplayName: text,
  artistDisplayBio: text,
  artistNationality: text,
  /** A year as text, e.g. "1471", or `""`. */
  artistBeginDate: text,
  artistEndDate: text,
  artistGender: text,
  /** Free text: "1514", "ca. 1830–32", "1790s". */
  objectDate: text,
  /** Machine-readable years, which may be wider than `objectDate` says. */
  objectBeginDate: z.int(),
  objectEndDate: z.int(),
  medium: text,
  /** One line per element (plate, sheet, image…), separated by CRLF. */
  dimensions: text,
  creditLine: text,
  classification: text,
  accessionNumber: text,
  objectURL: text,
  tags: z.array(metTagSchema).nullable(),
  metadataDate: text,
});

/** `/v1.1/search`: `objectIDs` is `null`, not `[]`, on a page past the last match. */
export const metSearchSchema = z.object({
  total: z.int().nonnegative(),
  objectIDs: z.array(z.int().positive()).nullable(),
});

export const metDepartmentsSchema = z.object({
  departments: z.array(z.object({ departmentId: z.int().positive(), displayName: text })),
});

/** The JSON body of an error: `{ "message": "ObjectID not found" }` and the like. */
export const metErrorSchema = z.object({ message: text });

export type MetObject = z.infer<typeof metObjectSchema>;
export type MetSearch = z.infer<typeof metSearchSchema>;
export type MetDepartments = z.infer<typeof metDepartmentsSchema>;
