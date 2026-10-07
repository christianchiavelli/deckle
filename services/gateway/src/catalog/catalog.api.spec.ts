import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { melencolia } from '../../test/support/fixtures.js';
import { errorCodes, graphql } from '../../test/support/graphql.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';
import { without } from '../../test/support/without.js';

const ARTWORK = /* GraphQL */ `
  query Artwork($slug: String!) {
    artwork(slug: $slug) {
      id
      slug
      title
      fullTitle
      artist {
        name
        bio
        nationality
        beginYear
        endYear
      }
      date
      year
      technique
      medium
      dimensions
      classification
      department
      culture
      period
      creditLine
      accessionNumber
      museumUrl
      image {
        url
        width
        height
        scanWidth
        scanHeight
      }
      sizes {
        size
        paper {
          width
          height
        }
        image {
          width
          height
        }
        ppi
        available
        unavailableReason
        requiredPixels
        variantId
        sku
        price {
          amount
          currencyCode
        }
      }
      priceFrom {
        amount
        currencyCode
      }
    }
  }
`;

const PAGE = /* GraphQL */ `
  query Page($first: Int, $after: String, $filter: ArtworkFilter) {
    artworks(first: $first, after: $after, filter: $filter) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          slug
        }
      }
    }
  }
`;

interface PageData {
  artworks: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    edges: { cursor: string; node: { slug: string } }[];
  };
}

describe('the catalogue over GraphQL', () => {
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

  it('lists every size, and says why A2 is not for sale and what it would take', async () => {
    const response = await graphql(gateway, ARTWORK, { slug: 'melencolia-i' });

    expect(response.errors).toBeUndefined();
    expect(response.data).toMatchObject({
      artwork: {
        id: '1',
        title: 'Melencolia I',
        image: {
          url: 'http://localhost:8080/assets/source/336228.jpg',
          width: 1622,
          height: 2048,
          scanWidth: 2820,
          scanHeight: 3561,
        },
        sizes: [
          {
            size: 'A4',
            paper: { width: 21, height: 29.7 },
            image: { width: 16, height: 20.2 },
            ppi: 447,
            available: true,
            unavailableReason: null,
            requiredPixels: null,
            variantId: '11',
            sku: '336228-A4',
            price: { amount: 5500, currencyCode: 'USD' },
          },
          { size: 'A3', ppi: 302, available: true, sku: '336228-A3', price: { amount: 9000 } },
          {
            size: 'A2',
            paper: { width: 42, height: 59.4 },
            ppi: 210,
            available: false,
            unavailableReason: 'RESOLUTION_TOO_LOW',
            requiredPixels: 3213,
            variantId: null,
            sku: null,
            price: null,
          },
          {
            size: 'A1',
            available: false,
            unavailableReason: 'RESOLUTION_TOO_LOW',
            requiredPixels: 4668,
          },
        ],
        priceFrom: { amount: 5500, currencyCode: 'USD' },
      },
    });
  });

  it('gives the year a work was begun and the technique commerce files it under', async () => {
    const melencoliaPage = await graphql(gateway, ARTWORK, { slug: 'melencolia-i' });
    expect(melencoliaPage.data).toMatchObject({
      artwork: { date: '1514', year: 1514, technique: 'Engravings' },
    });
    const wave = await graphql(gateway, ARTWORK, { slug: 'under-the-wave-off-kanagawa' });
    expect(wave.data).toMatchObject({
      artwork: { date: 'ca. 1830–32', year: 1830, technique: 'Woodblock prints' },
    });
  });

  it('answers null, never "" or 0, for what The Met leaves out', async () => {
    const melencoliaPage = await graphql(gateway, ARTWORK, { slug: 'melencolia-i' });
    expect(melencoliaPage.data).toMatchObject({ artwork: { culture: null, period: null } });

    // Commerce keeps an emptied text field as "" or blanks; those are absence too.
    const rhinoceros = await graphql(gateway, ARTWORK, { slug: 'the-rhinoceros' });
    expect(rhinoceros.data).toMatchObject({
      artwork: {
        culture: null,
        period: null,
        dimensions: [
          'image: 8 3/8 x 11 5/8 in. (21.3 x 29.5 cm) trimmed to block line except at top',
          'sheet: 9 3/8 x 11 3/4 in. (23.8 x 29.9 cm)',
        ],
      },
    });

    const sampler = await graphql(gateway, ARTWORK, { slug: 'alphabet-sampler' });
    expect(sampler.data).toMatchObject({
      artwork: {
        artist: null,
        date: null,
        year: null,
        technique: null,
        medium: null,
        dimensions: [],
        image: null,
        priceFrom: null,
      },
    });
  });

  it('tells a size the scan could print but commerce does not sell from one the scan cannot', async () => {
    const response = await graphql<{
      artwork: { sizes: { size: string; unavailableReason: string | null }[] };
    }>(gateway, ARTWORK, { slug: 'the-rhinoceros' });

    expect(
      response.data?.artwork.sizes.map(({ size, unavailableReason }) => [size, unavailableReason]),
    ).toEqual([
      ['A4', null],
      ['A3', 'NOT_OFFERED'],
      ['A2', 'RESOLUTION_TOO_LOW'],
      ['A1', 'RESOLUTION_TOO_LOW'],
    ]);
  });

  it('answers null for a slug no artwork has, and refuses one no artwork could have', async () => {
    expect((await graphql(gateway, ARTWORK, { slug: 'no-such-work' })).data).toEqual({
      artwork: null,
    });

    const malformed = await graphql(gateway, ARTWORK, { slug: 'Not A Slug' });
    expect(errorCodes(malformed)).toEqual(['BAD_USER_INPUT']);
  });

  it('pages through the catalogue by title with opaque cursors', async () => {
    const first = await graphql<PageData>(gateway, PAGE, { first: 2 });
    expect(first.data?.artworks).toMatchObject({
      totalCount: 4,
      pageInfo: { hasNextPage: true, hasPreviousPage: false },
      edges: [{ node: { slug: 'alphabet-sampler' } }, { node: { slug: 'melencolia-i' } }],
    });

    const second = await graphql<PageData>(gateway, PAGE, {
      first: 2,
      after: first.data?.artworks.pageInfo.endCursor,
    });
    expect(second.data?.artworks).toMatchObject({
      totalCount: 4,
      pageInfo: { hasNextPage: false, hasPreviousPage: true },
      edges: [
        { node: { slug: 'the-rhinoceros' } },
        { node: { slug: 'under-the-wave-off-kanagawa' } },
      ],
    });
  });

  it('defaults to 24 per page and refuses more than 48, or a cursor it never issued', async () => {
    const defaults = await graphql<PageData>(gateway, PAGE, {});
    expect(defaults.data?.artworks.edges).toHaveLength(4);

    for (const variables of [{ first: 49 }, { first: 0 }, { first: 2, after: 'b3BhcXVl' }]) {
      const refused = await graphql(gateway, PAGE, variables);
      expect(errorCodes(refused)).toEqual(['BAD_USER_INPUT']);
    }
  });

  it('filters by collection through the search index, then reads the products in one call', async () => {
    const response = await graphql<PageData>(gateway, PAGE, {
      filter: { collection: 'japanese-prints' },
    });

    expect(response.data?.artworks).toMatchObject({
      totalCount: 1,
      edges: [{ node: { slug: 'under-the-wave-off-kanagawa' } }],
    });
    expect(upstreams.commerceOperations()).toEqual(['CollectionProductIds', 'ArtworkProducts']);
  });

  it('lists the collections and pages through one', async () => {
    const response = await graphql(
      gateway,
      /* GraphQL */ `
        {
          collections {
            slug
            name
          }
          collection(slug: "prints") {
            name
            artworks(first: 1) {
              totalCount
              edges {
                node {
                  slug
                }
              }
            }
          }
          missing: collection(slug: "no-such-collection") {
            name
          }
        }
      `,
    );

    expect(response.data).toEqual({
      collections: [
        { slug: 'prints', name: 'Prints' },
        { slug: 'japanese-prints', name: 'Japanese Prints' },
      ],
      collection: {
        name: 'Prints',
        artworks: { totalCount: 4, edges: [{ node: { slug: 'alphabet-sampler' } }] },
      },
      missing: null,
    });
  });

  it('reads several artworks in one request to commerce', async () => {
    await graphql(
      gateway,
      /* GraphQL */ `
        {
          a: artwork(slug: "melencolia-i") {
            title
          }
          b: artwork(slug: "the-rhinoceros") {
            title
          }
          c: artwork(slug: "no-such-work") {
            title
          }
        }
      `,
    );

    expect(upstreams.commerceOperations()).toEqual(['ArtworkProducts']);
  });

  it('says which service failed when commerce is down', async () => {
    upstreams.modes.commerce = 'unavailable';

    const response = await graphql(gateway, PAGE, { first: 2 });

    expect(response.errors).toEqual([
      expect.objectContaining({
        message: 'The commerce service could not answer',
        extensions: { code: 'UPSTREAM_ERROR', service: 'commerce' },
      }),
    ]);
  });

  it('refuses a product that breaks the contract instead of guessing at it', async () => {
    upstreams.products = [
      { ...melencolia, customFields: without(melencolia.customFields, 'scanWidth') },
    ];

    const response = await graphql(gateway, ARTWORK, { slug: 'melencolia-i' });

    expect(errorCodes(response)).toEqual(['UPSTREAM_ERROR']);
  });
});
