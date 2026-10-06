import {
  BlockquoteFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  ParagraphFeature,
} from '@payloadcms/richtext-lexical';
import type { RichTextFieldValidation } from 'payload';
import { richText } from 'payload/shared';
import { validateHttpUrl } from '../fields/url';
import { findProseProblem } from './prose';

/**
 * A story is prose: paragraphs, two levels of heading, quotes, bold, italic
 * and links out. The list is short on purpose, because every node the editor
 * can make is a node the gateway has to map (see `prose.ts`).
 */
export const proseEditor = lexicalEditor({
  features: [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BlockquoteFeature(),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature({
      // No internal links: a story points at artworks by slug, never at CMS documents.
      enabledCollections: [],
      // Autolinks are a second node type for the same thing; the link button is enough.
      disableAutoLinks: true,
      fields: ({ defaultFields }) =>
        defaultFields.map((field) =>
          field.type === 'text' && field.name === 'url' && field.hasMany !== true
            ? { ...field, validate: validateHttpUrl }
            : field,
        ),
    }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
});

/**
 * The editor cannot produce anything else, but the REST API accepts any JSON,
 * so the server checks the shape before Lexical's own validation runs.
 */
export const validateProse: RichTextFieldValidation = async (value, options) => {
  if (value) {
    const problem = findProseProblem(value);
    if (problem) {
      return problem;
    }
  }
  return richText(value, options);
};
