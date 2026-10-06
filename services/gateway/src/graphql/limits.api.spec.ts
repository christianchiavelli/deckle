import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { errorCodes, graphql } from '../../test/support/graphql.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';
import { MAX_TOKENS } from './armor.js';

describe('operation limits', () => {
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

  it('refuses a query that costs too much, before asking any upstream', async () => {
    upstreams.reset();

    const response = await graphql(
      gateway,
      '{ curations { artworks { story { blocks { ... on ParagraphBlock { text { text } } } } } } }',
    );

    expect(response.status).toBe(400);
    expect(errorCodes(response)).toEqual(['QUERY_TOO_COMPLEX']);
    expect(upstreams.requests.commerce).toHaveLength(0);
    expect(upstreams.requests.cms).toHaveLength(0);
  });

  it('refuses a query nested deeper than any page needs', async () => {
    const response = await graphql(
      gateway,
      '{ collection(slug: "prints") { artworks { edges { node { story { blocks { ... on ParagraphBlock { text { href } } } } } } } } }',
    );

    expect(response.status).toBe(400);
    expect(response.errors?.[0]?.message).toMatch(/depth/i);
  });

  it('counts fields, not the fragments a client groups them in', async () => {
    const response = await graphql(
      gateway,
      `
        query Work {
          artwork(slug: "melencolia-i") {
            story {
              blocks {
                ... on ParagraphBlock {
                  text {
                    ...Run
                  }
                }
              }
            }
          }
        }
        fragment Run on TextRun {
          text
          bold
          italic
          href
        }
      `,
    );

    expect(response.errors?.map((error) => error.message).join(' ') ?? '').not.toMatch(/depth/i);
  });

  it('refuses too many aliases, a cheap way to multiply work', async () => {
    const aliases = Array.from(
      { length: 16 },
      (_, index) => `a${index}: collections { slug }`,
    ).join(' ');

    const response = await graphql(gateway, `{ ${aliases} }`);

    expect(response.status).toBe(400);
    expect(response.errors?.[0]?.message).toMatch(/aliases/i);
  });

  it('refuses a document longer than any real query before parsing all of it', async () => {
    const fields = Array.from({ length: MAX_TOKENS }, () => '__typename').join(' ');

    const response = await graphql(gateway, `{ ${fields} }`);

    expect(response.status).toBe(400);
    expect(response.errors?.[0]?.message).toMatch(/token/i);
  });

  it('refuses batched operations', async () => {
    const response = await request(gateway.app.getHttpServer())
      .post('/graphql')
      .send([{ query: '{ __typename }' }, { query: '{ __typename }' }]);

    expect(response.status).toBe(400);
  });
});

describe('outside production', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: { ...testEnv(upstreams), NODE_ENV: 'development' } });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  it('serves GraphiQL, with a policy that lets its scripts load', async () => {
    const response = await request(gateway.app.getHttpServer())
      .get('/graphql')
      .set('accept', 'text/html');

    expect(response.status).toBe(200);
    expect(response.text).toContain('GraphiQL');
    expect(response.headers['content-security-policy']).toContain('https://unpkg.com');
  });

  it('answers introspection and suggests field names', async () => {
    expect((await graphql(gateway, '{ __schema { queryType { name } } }')).data).toEqual({
      __schema: { queryType: { name: 'Query' } },
    });
    const typo = await graphql(gateway, '{ artworkz { totalCount } }');
    expect(typo.errors?.[0]?.message).toMatch(/Did you mean/);
  });
});

describe('in production', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: { ...testEnv(upstreams), NODE_ENV: 'production' } });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  it('serves no GraphiQL, and keeps the default policy', async () => {
    const response = await request(gateway.app.getHttpServer())
      .get('/graphql')
      .set('accept', 'text/html');

    expect(response.text).not.toContain('GraphiQL');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).not.toContain('unpkg');
  });

  it('refuses introspection and does not suggest field names', async () => {
    const introspection = await graphql(gateway, '{ __schema { queryType { name } } }');
    expect(introspection.status).toBe(400);

    const typo = await graphql(gateway, '{ artworkz { totalCount } }');
    expect(typo.errors?.[0]?.message).not.toMatch(/Did you mean/);
  });
});
