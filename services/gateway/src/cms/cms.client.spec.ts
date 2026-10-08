import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CMS_TEST_API_KEY, FakeUpstreams } from '../../test/support/fake-upstreams.js';
import type { Env } from '../config/env.js';
import { UpstreamContractError, UpstreamHttpError } from '../upstream/upstream-errors.js';
import { CmsClient } from './cms.client.js';

describe('CmsClient', () => {
  const upstreams = new FakeUpstreams();

  beforeAll(async () => {
    await upstreams.start();
  });

  beforeEach(() => {
    upstreams.reset();
  });

  afterAll(async () => {
    await upstreams.close();
  });

  const cmsClient = (apiKey = CMS_TEST_API_KEY) =>
    new CmsClient(
      new ConfigService<Env, true>({
        CMS_API_URL: `${upstreams.cmsUrl}/api/`,
        CMS_API_KEY: apiKey,
      }),
    );

  it("asks for every work's published story in one request, as the read-only API-key user", async () => {
    const stories = await cmsClient().storiesForArtworks(['melencolia-i', 'the-rhinoceros']);

    // The rhinoceros has a story, but only as a draft.
    expect(stories.map((story) => story.artworkSlug)).toEqual(['melencolia-i']);
    const [sent] = upstreams.requests.cms;
    expect(sent?.headers.authorization).toBe(`users API-Key ${CMS_TEST_API_KEY}`);
    expect(Object.fromEntries(sent?.query ?? [])).toEqual({
      'where[artworkSlug][in]': 'melencolia-i,the-rhinoceros',
      'where[_status][equals]': 'published',
      limit: '2',
      depth: '0',
    });
  });

  it('asks for published curations only, and drops a draft that comes back anyway', async () => {
    upstreams.ignoreStatusFilter = true;

    const curations = await cmsClient().curations();

    expect(curations.map((curation) => curation.slug)).toEqual(['durer-and-the-occult']);
    expect(upstreams.requests.cms[0]?.query.get('where[_status][equals]')).toBe('published');
    await expect(cmsClient().curationBySlug('animals-on-paper')).resolves.toBeNull();
    expect(upstreams.requests.cms[1]?.query.get('where[_status][equals]')).toBe('published');
  });

  it('asks for the newest version of everything, drafts kept, when the store previews', async () => {
    upstreams.draftStory('melencolia-i', { title: 'An angel, rewritten' });

    const stories = await cmsClient().storiesForArtworks(['melencolia-i', 'the-rhinoceros'], {
      drafts: true,
    });
    const curation = await cmsClient().curationBySlug('animals-on-paper', { drafts: true });
    const pages = await cmsClient().dropPages(['the-great-wave-numbered'], { drafts: true });

    expect(stories.map((story) => story.title)).toEqual([
      'An angel, rewritten',
      'An animal nobody in Nuremberg had seen',
    ]);
    expect(curation?.title).toBe('Animals on paper');
    expect(pages.map((page) => page.slug)).toEqual(['the-great-wave-numbered']);
    for (const sent of upstreams.requests.cms) {
      expect(sent.query.get('draft')).toBe('true');
      expect(sent.query.has('where[_status][equals]')).toBe(false);
    }
  });

  it('does not call the CMS for no works', async () => {
    await expect(cmsClient().storiesForArtworks([])).resolves.toEqual([]);
    expect(upstreams.requests.cms).toHaveLength(0);
  });

  it('reports a refused key as an HTTP error, not as an outage', async () => {
    await expect(cmsClient('wrong-key').curations()).rejects.toBeInstanceOf(UpstreamHttpError);
  });

  it('refuses a story in a shape it was not built for', async () => {
    upstreams.stories = [{ ...upstreams.stories[0]!, updatedAt: 'yesterday' }];

    await expect(cmsClient().storiesForArtworks(['melencolia-i'])).rejects.toBeInstanceOf(
      UpstreamContractError,
    );
  });
});
