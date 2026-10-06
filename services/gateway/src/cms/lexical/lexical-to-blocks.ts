import { z } from 'zod';

/**
 * Payload stores rich text as Lexical's JSON tree. The store gets a small, closed
 * vocabulary instead: paragraphs, two heading levels and quotes, made of runs of
 * text that may be bold, italic or a link. Anything else in the tree is dropped
 * with a warning, never passed through, so the store renders only what it knows.
 */

export interface TextRun {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly href: string | null;
}

export type StoryBlockRecord =
  | { readonly kind: 'paragraph'; readonly text: readonly TextRun[] }
  | { readonly kind: 'heading'; readonly level: 2 | 3; readonly text: readonly TextRun[] }
  | { readonly kind: 'quote'; readonly text: readonly TextRun[] };

export interface LexicalMapping {
  readonly blocks: readonly StoryBlockRecord[];
  readonly warnings: readonly string[];
}

// Lexical's text format bit flags (IS_BOLD and IS_ITALIC in the lexical package).
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;

const lexicalDocument = z.object({ root: z.object({ children: z.array(z.unknown()) }) });
const typedNode = z.looseObject({ type: z.string() });
const elementNode = z.looseObject({ children: z.array(z.unknown()).default([]) });
const headingNode = z.looseObject({ tag: z.string() });
const textNode = z.looseObject({ text: z.string(), format: z.number().int().catch(0) });
const linkNode = z.looseObject({
  // Payload keeps the link's settings under `fields`; plain Lexical puts `url` on the node.
  fields: z.looseObject({ url: z.string().optional(), linkType: z.string().optional() }).optional(),
  url: z.string().optional(),
});

export function lexicalToBlocks(document: unknown): LexicalMapping {
  const warnings: string[] = [];
  const parsed = lexicalDocument.safeParse(document);
  if (!parsed.success) {
    return { blocks: [], warnings: ['the body is not a Lexical document'] };
  }

  const blocks: StoryBlockRecord[] = [];
  for (const child of parsed.data.root.children) {
    const node = typedNode.safeParse(child);
    if (!node.success) {
      warnings.push('dropped a block without a type');
      continue;
    }
    const block = toBlock(node.data.type, child, warnings);
    if (block?.text.some((run) => run.text.trim() !== '')) {
      blocks.push(block);
    }
  }
  return { blocks, warnings };
}

function toBlock(type: string, node: unknown, warnings: string[]): StoryBlockRecord | null {
  switch (type) {
    case 'paragraph':
      return { kind: 'paragraph', text: inlineRuns(node, null, warnings) };
    case 'quote':
      return { kind: 'quote', text: inlineRuns(node, null, warnings) };
    case 'heading': {
      const tag = headingNode.safeParse(node);
      const level = tag.success ? headingLevel(tag.data.tag) : null;
      if (level === null) {
        warnings.push('dropped a heading without a level');
        return null;
      }
      if (tag.success && tag.data.tag !== `h${level}`) {
        warnings.push(`showed an ${tag.data.tag} heading at level ${level}`);
      }
      return { kind: 'heading', level, text: inlineRuns(node, null, warnings) };
    }
    default:
      warnings.push(`dropped a "${type}" block: a story holds paragraphs, headings and quotes`);
      return null;
  }
}

/** The store sets two heading levels under the story's title: h1 and h2 become 2, the rest 3. */
function headingLevel(tag: string): 2 | 3 | null {
  const match = /^h([1-6])$/.exec(tag);
  if (match === null) return null;
  return Number(match[1]) <= 2 ? 2 : 3;
}

function inlineRuns(node: unknown, href: string | null, warnings: string[]): TextRun[] {
  const element = elementNode.safeParse(node);
  if (!element.success) return [];

  const runs: TextRun[] = [];
  for (const child of element.data.children) {
    const typed = typedNode.safeParse(child);
    if (!typed.success) {
      warnings.push('dropped inline content without a type');
      continue;
    }
    switch (typed.data.type) {
      case 'text':
      case 'tab': {
        const text = textNode.safeParse(child);
        if (text.success) {
          runs.push({
            text: text.data.text,
            bold: (text.data.format & IS_BOLD) !== 0,
            italic: (text.data.format & IS_ITALIC) !== 0,
            href,
          });
        }
        break;
      }
      case 'linebreak':
        runs.push({ text: '\n', bold: false, italic: false, href });
        break;
      case 'link':
      case 'autolink':
        runs.push(...inlineRuns(child, linkTarget(child, warnings), warnings));
        break;
      default:
        warnings.push(`dropped inline "${typed.data.type}" content`);
    }
  }
  return mergeRuns(runs);
}

function linkTarget(node: unknown, warnings: string[]): string | null {
  const link = linkNode.safeParse(node);
  if (!link.success) return null;
  if (link.data.fields?.linkType === 'internal') {
    warnings.push('kept the text of an internal link, which the gateway cannot resolve yet');
    return null;
  }
  const url = link.data.fields?.url ?? link.data.url;
  const href = url === undefined ? null : safeHref(url);
  if (href === null) {
    warnings.push(`kept the text of a link to an unsafe or empty address: "${url ?? ''}"`);
  }
  return href;
}

/** Web and mail links, or a path on the shop itself. `javascript:` and the like never pass. */
export function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Lexical splits text wherever the editor once had a cursor; neighbours that look alike are joined. */
function mergeRuns(runs: readonly TextRun[]): TextRun[] {
  const merged: TextRun[] = [];
  for (const run of runs) {
    if (run.text === '') continue;
    const previous = merged.at(-1);
    if (
      previous?.bold === run.bold &&
      previous.italic === run.italic &&
      previous.href === run.href
    ) {
      merged[merged.length - 1] = { ...previous, text: previous.text + run.text };
    } else {
      merged.push(run);
    }
  }
  return merged;
}
