import { describe, expect, it } from 'vitest';
import { journalOf, storyHref, WHOLE_PRINT } from './journal';

const story = (updatedAt: string, detail: { x: number; y: number; zoom: number } | null) => ({
  title: 'About the print',
  lede: 'A lede.',
  updatedAt,
  detail,
});

const image = { url: 'http://localhost:8080/assets/source/x.webp', width: 1600, height: 1200 };

describe('journalOf', () => {
  it('lists the works with a story and a picture, the newest story first', () => {
    const entries = journalOf([
      { slug: 'older', title: 'Older', image, story: story('2026-10-01T10:00:00.000Z', null) },
      { slug: 'no-story', title: 'No story', image, story: null },
      {
        slug: 'no-picture',
        title: 'No picture',
        image: null,
        story: story('2026-10-03T10:00:00.000Z', null),
      },
      {
        slug: 'newer',
        title: 'Newer',
        image,
        story: { ...story('2026-10-02T10:00:00.000Z', { x: 74, y: 22, zoom: 3 }), lede: null },
      },
    ]);

    expect(entries).toEqual([
      {
        slug: 'newer',
        title: 'Newer',
        kicker: 'About the print',
        lede: null,
        image: {
          src: 'http://localhost:8080/assets/source/x.webp?preset=page&format=webp',
          width: 1600,
          height: 1200,
          detail: { x: 74, y: 22, zoom: 3 },
        },
      },
      expect.objectContaining({
        slug: 'older',
        image: expect.objectContaining({ detail: WHOLE_PRINT }),
      }),
    ]);
  });
});

describe('storyHref', () => {
  it("leads to the story on its print's page", () => {
    expect(storyHref('melencolia-i')).toBe('/prints/melencolia-i#story');
  });
});
