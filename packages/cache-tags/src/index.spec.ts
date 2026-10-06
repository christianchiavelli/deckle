import { describe, expect, it } from 'vitest';
import {
  artworkTag,
  CATALOG,
  collectionTag,
  curationTag,
  dropPageTag,
  isCacheTag,
  priceTag,
  stockTag,
  storyTag,
  workTags,
} from './index.js';

describe('the tag vocabulary', () => {
  it('spells each tag as a kind and a slug', () => {
    expect([
      artworkTag('melencolia-i'),
      priceTag('melencolia-i'),
      stockTag('melencolia-i'),
      collectionTag('engravings'),
      storyTag('melencolia-i'),
      curationTag('first-impressions'),
      dropPageTag('melencolia-i-numbered'),
    ]).toEqual([
      'artwork:melencolia-i',
      'price:melencolia-i',
      'stock:melencolia-i',
      'collection:engravings',
      'story:melencolia-i',
      'curation:first-impressions',
      'drop-page:melencolia-i-numbered',
    ]);
  });

  it("names everything a work's page shows", () => {
    expect(workTags('the-rhinoceros')).toEqual([
      'artwork:the-rhinoceros',
      'price:the-rhinoceros',
      'stock:the-rhinoceros',
      'story:the-rhinoceros',
    ]);
  });
});

describe('isCacheTag', () => {
  it('accepts every tag the vocabulary spells', () => {
    for (const tag of [CATALOG, ...workTags('a-3'), curationTag('x'), dropPageTag('y-2')]) {
      expect(isCacheTag(tag), tag).toBe(true);
    }
  });

  it('refuses anything else', () => {
    for (const tag of [
      '',
      'catalogue',
      'artwork:',
      'artwork:Melencolia',
      'artwork:melencolia--i',
      'artwork:-melencolia',
      'price:melencolia i',
      'user:42',
      `artwork:${'a'.repeat(256)}`,
    ]) {
      expect(isCacheTag(tag), tag).toBe(false);
    }
  });
});
