import { randomUUID } from 'node:crypto';
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionSlug,
  PayloadRequest,
  RequestContext,
} from 'payload';
import type { CmsEvent, CmsEventType, SubjectOf } from './event';
import { type Change, publicationChanges, publicationOf, type Publication } from './publication';
import { cmsEventsQueue, deliverCmsEventTaskSlug } from './task';

/** The columns of a row that decide whether, and where, the public sees it. */
interface PublishableRow {
  id: number | string;
  _status?: 'draft' | 'published' | null;
  updatedAt: string;
}

export interface EventSource<TType extends CmsEventType, TRow extends PublishableRow> {
  readonly collection: CollectionSlug;
  readonly type: TType;
  readonly subjectOf: (row: TRow) => SubjectOf[TType];
}

/**
 * Hooks that queue one event per public change of a collection: publish,
 * unpublish, a published edit, a restore, a delete. Draft saves and autosaves
 * leave the published row alone, so they queue nothing.
 *
 * The job is written with the request's transaction: if the save rolls back,
 * so does the event, and an event is never sent for a change that did not
 * happen.
 */
export function publicationHooks<TType extends CmsEventType, TRow extends PublishableRow>(
  source: EventSource<TType, TRow>,
): {
  beforeChange: CollectionBeforeChangeHook<TRow>;
  afterChange: CollectionAfterChangeHook<TRow>;
  afterDelete: CollectionAfterDeleteHook<TRow>;
} {
  type Published = Publication<SubjectOf[TType]> | null;

  // What the public saw of each document a request is updating, read before
  // the write and keyed by the request's context, which both hooks share.
  const publishedBeforeWrite = new WeakMap<RequestContext, Map<number | string, Published>>();

  const publicationOfRow = (row: TRow): Published =>
    publicationOf(row, () => source.subjectOf(row));

  // The collection's own row is the published version; `previousDoc` in the
  // hooks is the latest version, which may be a draft, so it cannot tell.
  const readPublished = async (req: PayloadRequest, id: number | string): Promise<Published> => {
    const row = await req.payload.db.findOne<TRow>({
      collection: source.collection,
      where: { id: { equals: id } },
      req,
    });
    return row ? publicationOfRow(row) : null;
  };

  const queueChanges = async (req: PayloadRequest, changes: Change<SubjectOf[TType]>[]) => {
    for (const change of changes) {
      const event = {
        id: randomUUID(),
        source: 'cms',
        type: source.type,
        action: change.action,
        occurredAt: new Date().toISOString(),
        subject: change.subject,
      } satisfies Omit<CmsEvent, 'type' | 'subject'> & {
        type: TType;
        subject: SubjectOf[TType];
      };
      await req.payload.jobs.queue({
        task: deliverCmsEventTaskSlug,
        queue: cmsEventsQueue,
        input: { event },
        req,
      });
    }
  };

  return {
    beforeChange: async ({ context, operation, originalDoc, req }) => {
      if (operation !== 'update' || !originalDoc) {
        return;
      }
      const seen = publishedBeforeWrite.get(context) ?? new Map<number | string, Published>();
      seen.set(originalDoc.id, await readPublished(req, originalDoc.id));
      publishedBeforeWrite.set(context, seen);
    },

    afterChange: async ({ context, doc, operation, req }) => {
      if (operation === 'create') {
        // A created document is its own row: published at once, or a draft.
        await queueChanges(req, publicationChanges(null, publicationOfRow(doc)));
        return;
      }
      const before = publishedBeforeWrite.get(context)?.get(doc.id) ?? null;
      await queueChanges(req, publicationChanges(before, await readPublished(req, doc.id)));
    },

    afterDelete: async ({ doc, req }) => {
      await queueChanges(req, publicationChanges(publicationOfRow(doc), null));
    },
  };
}
