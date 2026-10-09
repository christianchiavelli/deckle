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
      preview: (doc, { locale }) => previewLink('story', doc['artworkSlug'], locale),
      livePreview: {
        url: ({ data, locale }) => previewLink('story', data['artworkSlug'], locale.code),
      },
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
      {
        name: 'title',
        type: 'text',
        required: true,
        localized: true,
        label: { en: 'Title', pt: 'Título' },
      },
      {
        name: 'lede',
        type: 'textarea',
        localized: true,
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
        localized: true,
        required: true,
        label: { en: 'Body', pt: 'Texto' },
        editor: proseEditor,
        validate: validateProse,
      },
      {
        name: 'detail',
        type: 'group',
        label: { en: 'Detail', pt: 'Detalhe' },
        admin: {
          description: {
            en: 'The part of the print the story talks about, shown up close on its card and beside it on the work’s page: a point, in percent of the print’s width and height, and how close. Left empty, the card shows the whole print and the story stands alone.',
            pt: 'A parte da gravura de que a história fala, mostrada de perto no card e ao lado dela na página da obra: um ponto, em porcentagem da largura e da altura da gravura, e o quão perto. Vazio, o card mostra a gravura inteira e a história fica sozinha.',
          },
        },
        fields: [
          {
            name: 'x',
            type: 'number',
            min: 0,
            max: 100,
            label: { en: 'Across (%)', pt: 'Na largura (%)' },
          },
          {
            name: 'y',
            type: 'number',
            min: 0,
            max: 100,
            label: { en: 'Down (%)', pt: 'Na altura (%)' },
          },
          {
            name: 'zoom',
            type: 'number',
            min: 1,
            max: 8,
            label: { en: 'Zoom', pt: 'Zoom' },
            admin: {
              description: {
                en: '1 fills the card with the whole print; 3 is three times closer.',
                pt: '1 preenche o card com a gravura inteira; 3 é três vezes mais perto.',
              },
            },
          },
          {
            name: 'alt',
            type: 'text',
            localized: true,
            label: { en: 'What it shows', pt: 'O que mostra' },
            admin: {
              description: {
                en: 'The detail in a sentence, for whoever cannot see it. The work’s page shows the detail beside the story only once this and the caption are written.',
                pt: 'O detalhe numa frase, para quem não pode vê-lo. A página da obra só mostra o detalhe ao lado da história depois que isto e a legenda estão escritos.',
              },
            },
          },
          {
            name: 'caption',
            type: 'text',
            localized: true,
            label: { en: 'Caption', pt: 'Legenda' },
            admin: {
              description: {
                en: 'The line under the detail, beside the story.',
                pt: 'A linha embaixo do detalhe, ao lado da história.',
              },
            },
          },
        ],
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
