import { z } from 'zod';

/**
 * What the CMS tells the gateway when published content changes, as fixed by
 * the webhook contract. One `id` per event, kept across every retry, so the
 * gateway can drop a delivery it has already applied.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const storySubjectSchema = z.object({ slug, artworkSlug: slug });
export const slugSubjectSchema = z.object({ slug });

export type StorySubject = z.infer<typeof storySubjectSchema>;
export type SlugSubject = z.infer<typeof slugSubjectSchema>;

export const eventActions = ['created', 'updated', 'deleted'] as const;
export type EventAction = (typeof eventActions)[number];

const envelope = {
  id: z.uuid(),
  source: z.literal('cms'),
  action: z.enum(eventActions),
  occurredAt: z.iso.datetime(),
};

export const cmsEventSchema = z.discriminatedUnion('type', [
  z.object({ ...envelope, type: z.literal('story'), subject: storySubjectSchema }),
  z.object({ ...envelope, type: z.literal('curation'), subject: slugSubjectSchema }),
  z.object({ ...envelope, type: z.literal('drop-page'), subject: slugSubjectSchema }),
]);

export type CmsEvent = z.infer<typeof cmsEventSchema>;
export type CmsEventType = CmsEvent['type'];

/** The subject each event type carries, so a change can only name the right one. */
export interface SubjectOf {
  story: StorySubject;
  curation: SlugSubject;
  'drop-page': SlugSubject;
}
