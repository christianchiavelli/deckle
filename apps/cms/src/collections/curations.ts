import type { CollectionConfig } from 'payload';
import { slugHint, validateSlug, validateSlugList } from '../fields/slug';
import { blankToNull } from '../fields/text';
import type { Curation } from '../payload-types';
import { publicationHooks } from '../webhooks/hooks';
import { contentAccess, type ContentCollectionOptions } from './content';

/**
 * A curated collection: a title, a short introduction and artworks in the
 * order an editor chose. Works are named by slug; the gateway resolves them
 * against the catalogue, which lives in commerce, not here.
 */
export function curations({ previewLink }: ContentCollectionOptions): CollectionConfig {
  const events = publicationHooks<'curation', Curation>({
    collection: 'curations',
    type: 'curation',
    subjectOf: (curation) => ({ slug: curation.slug }),
  });

  return {
    slug: 'curations',
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
      preview: (doc) => previewLink('curation', doc['slug']),
    },
    access: contentAccess,
    versions: { drafts: true, maxPerDoc: 50 },
    hooks: {
      beforeChange: [events.beforeChange],
      afterChange: [events.afterChange],
      afterDelete: [events.afterDelete],
    },
    fields: [
      { name: 'title', type: 'text', required: true },
      {
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        validate: validateSlug,
        admin: { description: `The curation's address in the store: ${slugHint}.` },
      },
      {
        name: 'intro',
        type: 'textarea',
        hooks: { beforeChange: [blankToNull] },
        admin: { description: 'Optional: a few plain sentences that open the curation.' },
      },
      {
        name: 'artworks',
        type: 'text',
        hasMany: true,
        required: true,
        validate: validateSlugList,
        admin: {
          description: 'Artwork slugs, in the order the store shows them. Drag to reorder.',
        },
      },
    ],
  };
}
