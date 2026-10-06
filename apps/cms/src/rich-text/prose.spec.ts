import { describe, expect, it } from 'vitest';
import { findProseProblem, proseFromParagraphs, proseNodeTypes, textFormat } from './prose';

const text = (value: string, format = 0) => ({
  type: 'text',
  text: value,
  format,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
});

const element = { direction: 'ltr', format: '', indent: 0, version: 1 };

const stateWith = (...children: object[]) => ({
  root: { ...element, type: 'root', children },
});

const paragraph = (...children: object[]) => ({ ...element, type: 'paragraph', children });

const link = (url: string, linkType = 'custom') => ({
  ...element,
  type: 'link',
  id: '66f0c0ffee',
  fields: { linkType, url, newTab: false },
  children: [text('The Met')],
});

describe('prose', () => {
  it('accepts what the editor saves: paragraphs, h2 and h3, quotes, bold, italic, links, breaks', () => {
    const state = stateWith(
      { ...element, type: 'heading', tag: 'h2', children: [text('About the print')] },
      paragraph(
        text('Plain, '),
        text('bold', textFormat.bold),
        text(', '),
        text('italic', textFormat.italic),
        text(' and both', textFormat.bold | textFormat.italic),
        { type: 'linebreak', version: 1 },
        { type: 'tab', text: '\t', format: 0, detail: 2, mode: 'normal', style: '', version: 1 },
        link('https://www.metmuseum.org/art/collection/search/45434'),
      ),
      { ...element, type: 'heading', tag: 'h3', children: [text('Sources')] },
      { ...element, type: 'quote', children: [text('A quotation.')] },
    );
    expect(findProseProblem(state)).toBeNull();
  });

  it('lets alignment, indentation and inline styles pass, as presentation', () => {
    const state = stateWith({
      ...paragraph({ ...text('Pasted'), style: 'color: red' }),
      format: 'center',
      indent: 2,
    });
    expect(findProseProblem(state)).toBeNull();
  });

  it('builds seeded paragraphs that pass its own check', () => {
    const state = proseFromParagraphs(['One.', 'Two.']);
    expect(findProseProblem(state)).toBeNull();
    expect(state.root.children.map((child) => child.children[0]?.text)).toEqual(['One.', 'Two.']);
  });

  it('refuses a node the gateway does not map', () => {
    const list = { ...element, type: 'list', tag: 'ul', listType: 'bullet', children: [] };
    expect(findProseProblem(stateWith(list))).toMatch(
      /^only paragraphs, h2 and h3 headings, quotes, bold, italic and links are allowed/,
    );
  });

  it('refuses headings other than h2 and h3', () => {
    const heading = { ...element, type: 'heading', tag: 'h1', children: [text('Title')] };
    expect(findProseProblem(stateWith(heading))).toMatch(/^headings may only be h2 or h3/);
  });

  it('refuses text formats other than bold and italic', () => {
    const underline = 8;
    expect(findProseProblem(stateWith(paragraph(text('u', underline))))).toMatch(
      /^text may only be bold or italic/,
    );
  });

  it('refuses links that are not absolute http(s) URLs, or point inside the CMS', () => {
    expect(findProseProblem(stateWith(paragraph(link('javascript:alert(1)'))))).toMatch(
      /^links must be absolute http\(s\) URLs/,
    );
    expect(
      findProseProblem(stateWith(paragraph(link('https://example.org/', 'internal')))),
    ).toMatch(/^links may only point outside the CMS/);
  });

  it('refuses a link inside a link', () => {
    const nested = { ...link('https://example.org/'), children: [link('https://example.org/b')] };
    expect(findProseProblem(stateWith(paragraph(nested)))).not.toBeNull();
  });

  it('says where the problem is', () => {
    const state = stateWith(paragraph(text('fine')), paragraph(text('u', 8)));
    expect(findProseProblem(state)).toMatch(/\(at root\.children\.1\.children\.0\.format\)$/);
  });

  it('refuses something that is not an editor state at all', () => {
    expect(findProseProblem({ hello: 'world' })).not.toBeNull();
    expect(findProseProblem('text')).not.toBeNull();
  });

  it('names every node type it allows', () => {
    expect(proseNodeTypes).toEqual([
      'root',
      'paragraph',
      'heading',
      'quote',
      'text',
      'linebreak',
      'tab',
      'link',
    ]);
  });
});
