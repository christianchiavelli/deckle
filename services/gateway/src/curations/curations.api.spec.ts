import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { graphql } from '../../test/support/graphql.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';

describe('curations over GraphQL', () => {
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

  it("resolves a curation's works from commerce in one request, in the editor's order", async () => {
    const response = await graphql(
      gateway,
      '{ curations { slug title intro updatedAt artworks { slug } } curation(slug: "durer-and-the-occult") { title } }',
    );

    expect(response.data).toEqual({
      curations: [
        {
          slug: 'durer-and-the-occult',
          title: 'Dürer and the occult',
          intro: 'Three prints, one restless mind.',
          updatedAt: '2026-09-28T10:00:00.000Z',
          // The knight is not for sale in commerce, so it is left out.
          artworks: [{ slug: 'melencolia-i' }, { slug: 'the-rhinoceros' }],
        },
      ],
      curation: { title: 'Dürer and the occult' },
    });
    expect(upstreams.requests.commerce).toHaveLength(1);
  });

  it('never shows a curation that is still a draft', async () => {
    const response = await graphql(
      gateway,
      '{ curations { slug } curation(slug: "animals-on-paper") { title } }',
    );

    expect(response.data).toEqual({
      curations: [{ slug: 'durer-and-the-occult' }],
      curation: null,
    });
  });

  it('answers null for an unknown curation', async () => {
    const response = await graphql(gateway, '{ curation(slug: "no-such-curation") { title } }');
    expect(response.data).toEqual({ curation: null });
  });
});
