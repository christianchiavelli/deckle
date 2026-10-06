import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { curationSeeds, dropPageSeeds, storySeeds } from './content';

/** The data set the shop sells: the starter content may only name works in it. */
const catalog = JSON.parse(
  await readFile(new URL('../../../../data/met/catalog.json', import.meta.url), 'utf8'),
) as { works: { slug: string; objectUrl: string }[] };
const works = new Map(catalog.works.map((work) => [work.slug, work]));

const unique = (values: readonly string[]) => new Set(values).size === values.length;

describe('the starter content', () => {
  it('names only works the shop sells', () => {
    const named = [
      ...curationSeeds.flatMap((curation) => curation.artworks),
      ...storySeeds.map((story) => story.artworkSlug),
      ...dropPageSeeds.map((page) => page.artworkSlug),
    ];
    expect(named.filter((slug) => !works.has(slug))).toEqual([]);
  });

  it("cites each story's work on The Met", () => {
    for (const story of storySeeds) {
      expect(
        story.sources.map((source) => source.url),
        story.artworkSlug,
      ).toContain(works.get(story.artworkSlug)?.objectUrl);
    }
  });

  it('tells one story per work, and gives each curation and drop its own slug', () => {
    expect(unique(storySeeds.map((story) => story.artworkSlug))).toBe(true);
    expect(unique(curationSeeds.map((curation) => curation.slug))).toBe(true);
    expect(unique(dropPageSeeds.map((page) => page.slug))).toBe(true);
    for (const curation of curationSeeds) {
      expect(unique(curation.artworks), curation.slug).toBe(true);
    }
  });
});
