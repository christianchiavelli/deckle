import type { CollectionConfig } from 'payload';
import { slugHint, validateSlug } from '../fields/slug';
import type { DropPage } from '../payload-types';
import { proseEditor, validateProse } from '../rich-text/editor';
import { publicationHooks } from '../webhooks/hooks';
import { contentAccess, type ContentCollectionOptions } from './content';

/**
 * The words on a drop's page. The drop itself (its dates, edition size and
 * price) belongs to the gateway, which can never oversell it; this is only
 * what an editor writes about it.
 */
export function dropPages({ previewLink }: ContentCollectionOptions): CollectionConfig {
  const events = publicationHooks<'drop-page', DropPage>({
    collection: 'drop-pages',
    type: 'drop-page',
    subjectOf: (page) => ({ slug: page.slug }),
  });

  return {
    slug: 'drop-pages',
    labels: { singular: 'Drop page', plural: 'Drop pages' },
    admin: {
      useAsTitle: 'headline',
      defaultColumns: ['headline', 'slug', 'artworkSlug', '_status', 'updatedAt'],
      preview: (doc) => previewLink('drop-page', doc['slug']),
    },
    access: contentAccess,
    versions: { drafts: true, maxPerDoc: 50 },
    hooks: {
      beforeChange: [events.beforeChange],
      afterChange: [events.afterChange],
      afterDelete: [events.afterDelete],
    },
    fields: [
      {
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        validate: validateSlug,
        admin: { description: `The drop's address in the store: ${slugHint}.` },
      },
      {
        name: 'artworkSlug',
        type: 'text',
        required: true,
        index: true,
        validate: validateSlug,
        admin: { description: 'The artwork this drop prints.' },
      },
      { name: 'headline', type: 'text', required: true },
      {
        name: 'body',
        type: 'richText',
        required: true,
        editor: proseEditor,
        validate: validateProse,
      },
    ],
  };
}
