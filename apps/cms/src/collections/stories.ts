import type { CollectionConfig } from 'payload';
import { slugHint, validateSlug } from '../fields/slug';
import { validateHttpUrl } from '../fields/url';
import type { Story } from '../payload-types';
import { proseEditor, validateProse } from '../rich-text/editor';
import { publicationHooks } from '../webhooks/hooks';
import { contentAccess, type ContentCollectionOptions } from './content';

/** One story per artwork: what the store tells about the work, and where each fact comes from. */
export function stories({ previewLink }: ContentCollectionOptions): CollectionConfig {
  const events = publicationHooks<'story', Story>({
    collection: 'stories',
    type: 'story',
    // A story has no address of its own: it lives on its artwork's page.
    subjectOf: (story) => ({ slug: story.artworkSlug, artworkSlug: story.artworkSlug }),
  });

  return {
    slug: 'stories',
    labels: {
      singular: { en: 'Story', pt: 'História' },
      plural: { en: 'Stories', pt: 'Histórias' },
    },
    admin: {
      useAsTitle: 'artworkSlug',
      defaultColumns: ['artworkSlug', 'title', '_status', 'updatedAt'],
      preview: (doc) => previewLink('story', doc['artworkSlug']),
      livePreview: { url: ({ data }) => previewLink('story', data['artworkSlug']) },
    },
    access: contentAccess,
    versions: {
      drafts: { autosave: { interval: 1_000 } },
      maxPerDoc: 50,
    },
    hooks: {
      beforeChange: [events.beforeChange],
      afterChange: [events.afterChange],
      afterDelete: [events.afterDelete],
    },
    fields: [
      {
        name: 'artworkSlug',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        validate: validateSlug,
        label: { en: 'Artwork slug', pt: 'Slug da obra' },
        admin: {
          description: {
            en: `The artwork's slug in the catalogue: ${slugHint.en}.`,
            pt: `O slug da obra no catálogo: ${slugHint.pt}.`,
          },
        },
      },
      { name: 'title', type: 'text', required: true, label: { en: 'Title', pt: 'Título' } },
      {
        name: 'lede',
        type: 'textarea',
        required: true,
        label: { en: 'Lede', pt: 'Abertura' },
        admin: {
          description: {
            en: 'One or two plain sentences that open the story.',
            pt: 'Uma ou duas frases simples que abrem a história.',
          },
        },
      },
      {
        name: 'body',
        type: 'richText',
        required: true,
        label: { en: 'Body', pt: 'Texto' },
        editor: proseEditor,
        validate: validateProse,
      },
      {
        name: 'sources',
        type: 'array',
        required: true,
        minRows: 1,
        label: { en: 'Sources', pt: 'Fontes' },
        labels: {
          singular: { en: 'Source', pt: 'Fonte' },
          plural: { en: 'Sources', pt: 'Fontes' },
        },
        admin: {
          description: {
            en: 'Every story cites where its facts come from.',
            pt: 'Toda história cita de onde vêm os fatos.',
          },
        },
        fields: [
          { name: 'label', type: 'text', required: true, label: { en: 'Label', pt: 'Nome' } },
          {
            name: 'url',
            type: 'text',
            required: true,
            validate: validateHttpUrl,
            label: { en: 'URL', pt: 'URL' },
          },
        ],
      },
    ],
  };
}
