import { type GraphQLSchema, parse } from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_QUERY_COMPLEXITY } from './complexity.js';
import { queryComplexity } from './query-complexity.js';
import { buildGatewaySchema } from './schema-file.js';

/** Queries shaped like the store's pages, at their largest. */
const storePages = {
  listing: `{
    artworks(first: 48) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { cursor node { id slug title artist { name } image { url width height } priceFrom { amount currencyCode } } }
    }
  }`,
  artwork: `{
    artwork(slug: "melencolia-i") {
      id slug title fullTitle date medium dimensions classification department culture period creditLine accessionNumber museumUrl
      artist { name bio nationality beginYear endYear }
      image { url width height scanWidth scanHeight }
      sizes { size paper { width height } image { width height } ppi available unavailableReason requiredPixels variantId sku price { amount currencyCode } }
      priceFrom { amount currencyCode }
      story {
        title lede updatedAt sources { label url }
        blocks {
          ... on HeadingBlock { level text { text bold italic href } }
          ... on ParagraphBlock { text { text bold italic href } }
          ... on QuoteBlock { text { text bold italic href } }
        }
      }
    }
  }`,
  collection: `{
    collection(slug: "prints") {
      name
      artworks(first: 48) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { slug title image { url } priceFrom { amount currencyCode } } } }
    }
  }`,
  curation: `{ curation(slug: "durer-and-the-occult") { title intro artworks { slug title image { url width height } priceFrom { amount currencyCode } } } }`,
};

/** Shapes no page needs, each one a fan-out across services. */
const fanOuts = {
  everyCurationsStories: `{ curations { artworks { story { blocks { ... on ParagraphBlock { text { text } } } } } } }`,
  everyCollectionsPage: `{ collections { artworks(first: 48) { edges { node { title sizes { price { amount } } } } } } }`,
  storiesInAListing: `{ artworks(first: 48) { edges { node { story { blocks { ... on ParagraphBlock { text { text } } } } } } } }`,
};

describe('query complexity', () => {
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await buildGatewaySchema();
  });

  it.each(Object.entries(storePages))('lets the %s page through', (_name, query) => {
    expect(queryComplexity(schema, parse(query))).toBeLessThan(MAX_QUERY_COMPLEXITY / 2);
  });

  it.each(Object.entries(fanOuts))('prices %s above the limit', (_name, query) => {
    expect(queryComplexity(schema, parse(query))).toBeGreaterThan(MAX_QUERY_COMPLEXITY);
  });

  it('prices a page by the size asked for, even when it comes from a variable', () => {
    const page = parse(
      'query Page($first: Int) { artworks(first: $first) { edges { node { title } } } }',
    );

    const small = queryComplexity(schema, page, { first: 2 });
    const large = queryComplexity(schema, page, { first: 48 });
    const omitted = queryComplexity(schema, page, {});

    expect(large).toBeGreaterThan(small * 10);
    // Left out, the page has its default size of 24.
    expect(omitted).toBeGreaterThan(small);
    expect(omitted).toBeLessThan(large);
  });

  it('caps the price of a page at the largest page allowed', () => {
    const page = parse(
      'query Page($first: Int) { artworks(first: $first) { edges { node { title } } } }',
    );
    expect(queryComplexity(schema, page, { first: 10_000 })).toBe(
      queryComplexity(schema, page, { first: 48 }),
    );
  });
});
