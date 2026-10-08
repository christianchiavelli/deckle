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
    labels: {
      singular: { en: 'Curation', pt: 'Curadoria' },
      plural: { en: 'Curations', pt: 'Curadorias' },
    },
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
      preview: (doc) => previewLink('curation', doc['slug']),
      livePreview: { url: ({ data }) => previewLink('curation', data['slug']) },
    },
    access: contentAccess,
    versions: { drafts: true, maxPerDoc: 50 },
    hooks: {
      beforeChange: [events.beforeChange],
      afterChange: [events.afterChange],
      afterDelete: [events.afterDelete],
    },
    fields: [
      { name: 'title', type: 'text', required: true, label: { en: 'Title', pt: 'Título' } },
      {
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        validate: validateSlug,
        admin: {
          description: {
            en: `The curation's address in the store: ${slugHint.en}.`,
            pt: `O endereço da curadoria na loja: ${slugHint.pt}.`,
          },
        },
      },
      {
        name: 'intro',
        type: 'textarea',
        hooks: { beforeChange: [blankToNull] },
        label: { en: 'Introduction', pt: 'Introdução' },
        admin: {
          description: {
            en: 'Optional: a few plain sentences that open the curation.',
            pt: 'Opcional: algumas frases simples que abrem a curadoria.',
          },
        },
      },
      {
        name: 'artworks',
        type: 'text',
        hasMany: true,
        required: true,
        // The gateway prices a curation's works at this many (CURATION_MAX_WORKS).
        maxRows: 24,
        validate: validateSlugList,
        label: { en: 'Artworks', pt: 'Obras' },
        admin: {
          description: {
            en: 'Artwork slugs, in the order the store shows them, 24 at most. Drag to reorder.',
            pt: 'Slugs das obras, na ordem em que a loja as mostra, 24 no máximo. Arraste para reordenar.',
          },
        },
      },
    ],
  };
}
