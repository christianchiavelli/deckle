import { describe, expect, it } from 'vitest';
import { lexicalToBlocks, safeHref } from './lexical-to-blocks.js';

const text = (value: string, format = 0) => ({ type: 'text', text: value, format, version: 1 });
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', version: 1, children });
const document = (...children: unknown[]) => ({ root: { type: 'root', version: 1, children } });
const plain = (value: string) => ({ text: value, bold: false, italic: false, href: null });

describe('lexicalToBlocks', () => {
  it('maps paragraphs, h2 and h3 headings and quotes, in order', () => {
    const result = lexicalToBlocks(
      document(
        { type: 'heading', tag: 'h2', children: [text('One')] },
        paragraph(text('Two')),
        { type: 'heading', tag: 'h3', children: [text('Three')] },
        { type: 'quote', children: [text('Four')] },
      ),
    );

    expect(result).toEqual({
      blocks: [
        { kind: 'heading', level: 2, text: [plain('One')] },
        { kind: 'paragraph', text: [plain('Two')] },
        { kind: 'heading', level: 3, text: [plain('Three')] },
        { kind: 'quote', text: [plain('Four')] },
      ],
      warnings: [],
    });
  });

  it('reads bold and italic from the format bits and ignores the rest', () => {
    const { blocks } = lexicalToBlocks(
      document(
        paragraph(text('b', 1), text('i', 2), text('bi', 3), text('underlined code', 8 | 16)),
      ),
    );

    expect(blocks[0]?.text).toEqual([
      { text: 'b', bold: true, italic: false, href: null },
      { text: 'i', bold: false, italic: true, href: null },
      { text: 'bi', bold: true, italic: true, href: null },
      plain('underlined code'),
    ]);
  });

  it('carries a link to every run inside it, from Payload fields or a plain Lexical url', () => {
    const { blocks, warnings } = lexicalToBlocks(
      document(
        paragraph(
          text('See '),
          {
            type: 'link',
            fields: { linkType: 'custom', url: 'https://www.metmuseum.org/' },
            children: [text('The '), text('Met', 2)],
          },
          { type: 'autolink', url: 'https://example.org/a', children: [text('a')] },
        ),
      ),
    );

    expect(blocks[0]?.text).toEqual([
      plain('See '),
      { text: 'The ', bold: false, italic: false, href: 'https://www.metmuseum.org/' },
      { text: 'Met', bold: false, italic: true, href: 'https://www.metmuseum.org/' },
      { text: 'a', bold: false, italic: false, href: 'https://example.org/a' },
    ]);
    expect(warnings).toEqual([]);
  });

  it('keeps the text of a link it cannot follow, without the link', () => {
    const { blocks, warnings } = lexicalToBlocks(
      document(
        paragraph(
          { type: 'link', fields: { url: 'javascript:alert(1)' }, children: [text('unsafe')] },
          {
            type: 'link',
            fields: { linkType: 'internal', doc: { value: 3 } },
            children: [text(' internal')],
          },
        ),
      ),
    );

    expect(blocks[0]?.text).toEqual([plain('unsafe internal')]);
    expect(warnings).toHaveLength(2);
  });

  it('joins runs the editor split, and keeps line breaks and tabs as text', () => {
    const { blocks } = lexicalToBlocks(
      document(
        paragraph(
          text('Mel'),
          text('encolia'),
          { type: 'linebreak' },
          { type: 'tab', text: '\t', format: 0 },
          text('I'),
        ),
      ),
    );

    expect(blocks[0]?.text).toEqual([plain('Melencolia\n\tI')]);
  });

  it('drops what a story cannot hold, with a warning for each, never passing it through', () => {
    const { blocks, warnings } = lexicalToBlocks(
      document(
        { type: 'upload', value: 7, relationTo: 'media' },
        {
          type: 'list',
          listType: 'bullet',
          children: [{ type: 'listitem', children: [text('item')] }],
        },
        paragraph(text('kept'), { type: 'mention', name: 'someone' }),
        { no: 'type' },
      ),
    );

    expect(blocks).toEqual([{ kind: 'paragraph', text: [plain('kept')] }]);
    expect(warnings).toEqual([
      'dropped a "upload" block: a story holds paragraphs, headings and quotes',
      'dropped a "list" block: a story holds paragraphs, headings and quotes',
      'dropped inline "mention" content',
      'dropped a block without a type',
    ]);
  });

  it('shows other heading levels at the nearest level the store has, and says so', () => {
    const { blocks, warnings } = lexicalToBlocks(
      document(
        { type: 'heading', tag: 'h1', children: [text('Big')] },
        { type: 'heading', tag: 'h5', children: [text('Small')] },
        { type: 'heading', tag: 'span', children: [text('Odd')] },
      ),
    );

    expect(blocks.map((block) => (block.kind === 'heading' ? block.level : null))).toEqual([2, 3]);
    expect(warnings).toEqual([
      'showed an h1 heading at level 2',
      'showed an h5 heading at level 3',
      'dropped a heading without a level',
    ]);
  });

  it('leaves out empty paragraphs, which editors leave behind', () => {
    const { blocks } = lexicalToBlocks(
      document(paragraph(), paragraph(text('  ')), paragraph(text('words'))),
    );
    expect(blocks).toHaveLength(1);
  });

  it('turns a body that is not Lexical into no blocks and a warning', () => {
    expect(lexicalToBlocks('<p>html</p>')).toEqual({
      blocks: [],
      warnings: ['the body is not a Lexical document'],
    });
    expect(lexicalToBlocks(null).blocks).toEqual([]);
  });
});

describe('safeHref', () => {
  it.each([
    ['https://www.metmuseum.org/x', 'https://www.metmuseum.org/x'],
    ['http://example.org', 'http://example.org/'],
    ['mailto:prints@example.org', 'mailto:prints@example.org'],
    ['/collections/prints', '/collections/prints'],
  ])('keeps %s', (url, expected) => {
    expect(safeHref(url)).toBe(expected);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', '//evil.example/x', 'not a url', ''])(
    'drops %s',
    (url) => {
      expect(safeHref(url)).toBeNull();
    },
  );
});
