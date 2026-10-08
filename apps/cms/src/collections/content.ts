import type { CollectionConfig } from 'payload';
import { readContent, writeContent } from '../access/rules';
import type { CmsEventType } from '../webhooks/event';

/** Builds the store's preview address for a document, or `null` while it has no slug. */
/** The store page that previews a document, in the locale being edited. */
export type PreviewLink = (type: CmsEventType, slug: unknown, locale?: string) => string | null;

export interface ContentCollectionOptions {
  readonly previewLink: PreviewLink;
}

/**
 * Editors write; the gateway's user reads, drafts and versions included,
 * because preview reads drafts through it. Nobody signed out reads anything:
 * the store only ever sees content through the gateway.
 */
export const contentAccess = {
  read: readContent,
  readVersions: readContent,
  create: writeContent,
  update: writeContent,
  delete: writeContent,
} satisfies CollectionConfig['access'];
