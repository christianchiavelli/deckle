import { z } from 'zod';

/** Vendure and Payload send their own ids, as numbers or strings; both read as strings. */
const entityId = z.union([z.string().min(1), z.int().nonnegative()]).transform(String);

/** Slugs end up inside cache tags, which cannot hold whitespace. */
const slug = z.string().min(1).max(200).regex(/^\S+$/, { error: 'slug cannot contain whitespace' });

const delivery = {
  /** The same for every attempt to deliver one event: what deduplication keys on. */
  id: z.uuid(),
  action: z.enum(['created', 'updated', 'deleted']),
  occurredAt: z.iso.datetime({ offset: true }),
};

const commerce = { ...delivery, source: z.literal('commerce') };
const cms = { ...delivery, source: z.literal('cms') };

const variantSubject = z.object({ productId: entityId, slug, variantIds: z.array(entityId) });

export const commerceEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...commerce,
    type: z.literal('product'),
    subject: z.object({ productId: entityId, slug }),
  }),
  z.object({ ...commerce, type: z.literal('variant'), subject: variantSubject }),
  z.object({ ...commerce, type: z.literal('price'), subject: variantSubject }),
  z.object({ ...commerce, type: z.literal('stock'), subject: variantSubject }),
  z.object({
    ...commerce,
    type: z.literal('collection'),
    subject: z.object({ collectionId: entityId, slug }),
  }),
  z.object({ ...commerce, type: z.literal('asset'), subject: z.object({ assetId: entityId }) }),
]);

export const cmsEventSchema = z.discriminatedUnion('type', [
  z.object({ ...cms, type: z.literal('story'), subject: z.object({ slug, artworkSlug: slug }) }),
  z.object({ ...cms, type: z.literal('curation'), subject: z.object({ slug }) }),
  z.object({ ...cms, type: z.literal('drop-page'), subject: z.object({ slug }) }),
]);

export type CommerceEvent = z.output<typeof commerceEventSchema>;
export type CmsEvent = z.output<typeof cmsEventSchema>;
export type HookEvent = CommerceEvent | CmsEvent;
