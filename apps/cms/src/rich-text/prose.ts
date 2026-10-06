import { z } from 'zod';

/**
 * The rich text a story or drop page may hold, as the Lexical JSON Payload
 * stores. It is the contract with the gateway, which maps each of these node
 * types to a typed block: a node the editor allows is a node it must handle.
 *
 * Alignment, indentation and inline styles can arrive with pasted text; they
 * are presentation, so they pass through and the gateway ignores them.
 */

/** Lexical's text format bits that the editor keeps; the others are stripped as they are typed. */
export const textFormat = { bold: 1, italic: 2 } as const;

const allowedFormatBits = textFormat.bold | textFormat.italic;

const httpUrl = z.url({ protocol: /^https?$/, error: 'links must be absolute http(s) URLs' });

const textNode = z.object({
  type: z.literal('text'),
  text: z.string(),
  format: z
    .int()
    .nonnegative()
    .refine((bits) => (bits & ~allowedFormatBits) === 0, 'text may only be bold or italic'),
});

const lineBreakNode = z.object({ type: z.literal('linebreak') });

const tabNode = z.object({ type: z.literal('tab') });

const linkNode = z.object({
  type: z.literal('link'),
  fields: z.object({
    linkType: z.literal('custom', 'links may only point outside the CMS'),
    url: httpUrl,
    newTab: z.boolean().optional(),
  }),
  children: z.array(z.discriminatedUnion('type', [textNode, lineBreakNode, tabNode])),
});

const inlineNode = z.discriminatedUnion('type', [textNode, lineBreakNode, tabNode, linkNode]);

const paragraphNode = z.object({ type: z.literal('paragraph'), children: z.array(inlineNode) });

const headingNode = z.object({
  type: z.literal('heading'),
  tag: z.enum(['h2', 'h3'], 'headings may only be h2 or h3'),
  children: z.array(inlineNode),
});

const quoteNode = z.object({ type: z.literal('quote'), children: z.array(inlineNode) });

const blockNode = z.discriminatedUnion('type', [paragraphNode, headingNode, quoteNode]);

export const proseSchema = z.object({
  root: z.object({ type: z.literal('root'), children: z.array(blockNode) }),
});

export type Prose = z.infer<typeof proseSchema>;

/** The node types a story's body can contain, for the record and the gateway's mapping. */
export const proseNodeTypes = [
  'root',
  'paragraph',
  'heading',
  'quote',
  'text',
  'linebreak',
  'tab',
  'link',
] as const;

/**
 * Plain paragraphs as the Lexical JSON the editor itself saves, with the
 * presentational properties it always writes, so seeded text opens in the
 * admin exactly like typed text.
 */
export function proseFromParagraphs(paragraphs: readonly string[]) {
  const element = { direction: 'ltr', format: '', indent: 0, version: 1 } as const;
  return {
    root: {
      ...element,
      type: 'root',
      children: paragraphs.map((text) => ({
        ...element,
        type: 'paragraph',
        textFormat: 0,
        textStyle: '',
        children: [
          { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
        ],
      })),
    },
  };
}

/** Why `state` is not prose, in words an editor can act on, or `null` when it is. */
export function findProseProblem(state: unknown): string | null {
  const result = proseSchema.safeParse(state);
  if (result.success) {
    return null;
  }
  return result.error.issues
    .map((issue) => {
      const where = issue.path.length > 0 ? ` (at ${issue.path.join('.')})` : '';
      const what =
        issue.code === 'invalid_union' && issue.path.at(-1) === 'type'
          ? 'only paragraphs, h2 and h3 headings, quotes, bold, italic and links are allowed'
          : issue.message;
      return `${what}${where}`;
    })
    .join('; ');
}
