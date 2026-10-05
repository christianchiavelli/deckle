import { describe, expect, it } from 'vitest';
import { workSchema } from './catalog.js';
import { curation } from './curation.js';

describe('the curation', () => {
  it('names each object once and gives each a slug of its own', () => {
    const ids = curation.map((work) => work.objectId);
    const slugs = curation.map((work) => work.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('uses slugs the catalog accepts, short enough to read in a URL', () => {
    for (const { slug } of curation) {
      expect(workSchema.shape.slug.safeParse(slug).success, slug).toBe(true);
      expect(slug.length, slug).toBeLessThanOrEqual(40);
    }
  });

  it('gives every work a trimmed short title', () => {
    for (const { shortTitle } of curation) {
      expect(shortTitle).toBe(shortTitle.trim());
      expect(shortTitle.length).toBeGreaterThan(0);
    }
  });

  it('keeps the five works the services were first seeded with, under the same slugs', () => {
    expect(curation.slice(0, 5).map(({ objectId, slug }) => [objectId, slug])).toEqual([
      [336228, 'melencolia-i'],
      [356497, 'the-rhinoceros'],
      [336223, 'knight-death-and-the-devil'],
      [338473, 'the-sleep-of-reason-produces-monsters'],
      [45434, 'under-the-wave-off-kanagawa'],
    ]);
  });
});
