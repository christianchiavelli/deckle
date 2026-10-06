import type { EventAction } from './event';

/** A subject is the event's address: flat strings, compared field by field. */
export type Subject = Readonly<Record<string, string>>;

/**
 * What the public can see of a document: its subject and the moment its
 * published row was last written, or nothing when it is not published.
 *
 * Payload keeps the published version in the collection's own row and writes
 * drafts (every autosave included) only to the versions table, so the row's
 * `updatedAt` moves on publish, unpublish and restore, never on a draft save.
 */
export interface Publication<TSubject extends Subject> {
  readonly subject: TSubject;
  readonly writtenAt: string;
}

export interface Change<TSubject extends Subject> {
  readonly action: EventAction;
  readonly subject: TSubject;
}

/** Reads a document row as the public sees it. */
export function publicationOf<TSubject extends Subject>(
  row: { _status?: 'draft' | 'published' | null; updatedAt: string },
  subjectOf: () => TSubject,
): Publication<TSubject> | null {
  return row._status === 'published' ? { subject: subjectOf(), writtenAt: row.updatedAt } : null;
}

/**
 * The events a write produced, from what the public saw before it to what it
 * sees after. A subject that changed its slug is gone from one address and new
 * at another, so it is reported as a deletion and a creation.
 */
export function publicationChanges<TSubject extends Subject>(
  before: Publication<TSubject> | null,
  after: Publication<TSubject> | null,
): Change<TSubject>[] {
  if (!before) {
    return after ? [{ action: 'created', subject: after.subject }] : [];
  }
  if (!after) {
    return [{ action: 'deleted', subject: before.subject }];
  }
  if (before.writtenAt === after.writtenAt) {
    return [];
  }
  if (sameSubject(before.subject, after.subject)) {
    return [{ action: 'updated', subject: after.subject }];
  }
  return [
    { action: 'deleted', subject: before.subject },
    { action: 'created', subject: after.subject },
  ];
}

function sameSubject(a: Subject, b: Subject): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}
