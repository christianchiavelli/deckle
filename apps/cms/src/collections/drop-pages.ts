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
    labels: {
      singular: { en: 'Drop page', pt: 'Página de drop' },
      plural: { en: 'Drop pages', pt: 'Páginas de drop' },
    },
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
        admin: {
          description: {
            en: `The drop's address in the store: ${slugHint.en}.`,
            pt: `O endereço do drop na loja: ${slugHint.pt}.`,
          },
        },
      },
      {
        name: 'artworkSlug',
        type: 'text',
        required: true,
        index: true,
        validate: validateSlug,
        label: { en: 'Artwork slug', pt: 'Slug da obra' },
        admin: {
          description: { en: 'The artwork this drop prints.', pt: 'A obra que este drop imprime.' },
        },
      },
      {
        name: 'headline',
        type: 'text',
        required: true,
        label: { en: 'Headline', pt: 'Título' },
      },
      {
        name: 'body',
        type: 'richText',
        required: true,
        label: { en: 'Body', pt: 'Texto' },
        editor: proseEditor,
        validate: validateProse,
      },
    ],
  };
}
