import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { graphql } from '../../test/support/graphql.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';

const STORY_FIELDS = /* GraphQL */ `
  title
  lede
  updatedAt
  sources { label url }
  blocks {
    __typename
    ... on HeadingBlock { level text { text bold italic href } }
    ... on ParagraphBlock { text { text bold italic href } }
    ... on QuoteBlock { text { text bold italic href } }
  }
`;

describe('stories over GraphQL', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: testEnv(upstreams) });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  beforeEach(() => {
    upstreams.reset();
  });

  it("maps the CMS's rich text to the store's blocks, and drops what the store cannot show", async () => {
    const response = await graphql(
      gateway,
      `{ artwork(slug: "melencolia-i") { story { ${STORY_FIELDS} } } }`,
    );

    expect(response.errors).toBeUndefined();
    expect(response.data).toEqual({
      artwork: {
        story: {
          title: 'The angel who cannot act',
          lede: 'Why a winged figure sits idle among tools.',
          updatedAt: '2026-09-30T10:00:00.000Z',
          sources: [
            {
              label: 'The Met, Heilbrunn Timeline of Art History',
              url: 'https://www.metmuseum.org/toah/',
            },
            { label: 'Panofsky, The Life and Art of Albrecht Dürer', url: null },
          ],
          blocks: [
            {
              __typename: 'HeadingBlock',
              level: 2,
              text: [{ text: 'A print about thinking', bold: false, italic: false, href: null }],
            },
            {
              __typename: 'ParagraphBlock',
              text: [
                { text: 'Dürer cut ', bold: false, italic: false, href: null },
                { text: 'Melencolia I', bold: false, italic: true, href: null },
                { text: ' in ', bold: false, italic: false, href: null },
                { text: '1514', bold: true, italic: false, href: null },
                { text: '. See ', bold: false, italic: false, href: null },
                {
                  text: 'the museum page',
                  bold: false,
                  italic: false,
                  href: 'https://www.metmuseum.org/art/collection/search/336228',
                },
                { text: '.', bold: false, italic: false, href: null },
              ],
            },
            {
              __typename: 'QuoteBlock',
              text: [
                { text: 'Saturn, the melancholic planet.', bold: true, italic: true, href: null },
              ],
            },
          ],
        },
      },
    });
  });

  it('answers null for a work the CMS has no story about', async () => {
    const response = await graphql(
      gateway,
      '{ artwork(slug: "alphabet-sampler") { story { title } } }',
    );
    expect(response.data).toEqual({ artwork: { story: null } });
  });

  it('never shows a story that is still a draft', async () => {
    const response = await graphql(
      gateway,
      '{ artwork(slug: "the-rhinoceros") { story { title } } }',
    );

    expect(response.data).toEqual({ artwork: { story: null } });
    expect(upstreams.requests.cms[0]?.query.get('where[_status][equals]')).toBe('published');
  });

  it('costs one request to each upstream for a whole page of works and their stories', async () => {
    const response = await graphql(
      gateway,
      '{ artworks(first: 4) { edges { node { slug story { title } } } } }',
    );

    expect(response.errors).toBeUndefined();
    expect(upstreams.requests.commerce).toHaveLength(1);
    expect(upstreams.requests.cms).toHaveLength(1);
    expect(
      upstreams.requests.cms[0]?.query.get('where[artworkSlug][in]')?.split(',').sort(),
    ).toEqual([
      'alphabet-sampler',
      'melencolia-i',
      'the-rhinoceros',
      'under-the-wave-off-kanagawa',
    ]);
  });

  it('still serves the catalogue when the CMS is down, with the story as a field error', async () => {
    upstreams.modes.cms = 'unavailable';

    const response = await graphql(
      gateway,
      '{ artwork(slug: "melencolia-i") { title story { title } } }',
    );

    expect(response.data).toEqual({ artwork: { title: 'Melencolia I', story: null } });
    expect(response.errors).toEqual([
      expect.objectContaining({
        path: ['artwork', 'story'],
        extensions: { code: 'UPSTREAM_ERROR', service: 'cms' },
      }),
    ]);
  });
});
