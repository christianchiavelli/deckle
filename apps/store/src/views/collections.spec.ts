import { describe, expect, it } from 'vitest';
import { greatWave, melencolia, tileFrom } from '../test/works';
import { listedCurations, picturesOf } from './collections';

const curation = (slug: string, artworks = [tileFrom(melencolia), tileFrom(greatWave)]) => ({
  slug,
  title: slug,
  intro: null,
  artworks,
});

describe('listedCurations', () => {
  it("leaves out the front page's selection and any collection with no works", () => {
    const listed = listedCurations(
      [curation('durer'), curation('first-impressions'), curation('empty', [])],
      'first-impressions',
    );
    expect(listed.map((entry) => entry.slug)).toEqual(['durer']);
  });
});

describe('picturesOf', () => {
  it('gives the pictures of the works that have one, in the editor’s order', () => {
    const withoutPicture = { ...tileFrom(melencolia), image: null };
    expect(picturesOf(curation('x', [withoutPicture, tileFrom(greatWave)]))).toEqual([
      tileFrom(greatWave).image,
    ]);
  });
});
