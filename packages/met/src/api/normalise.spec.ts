import { describe, expect, it } from 'vitest';
import { MetResponseError } from './errors.js';
import { metObjectSchema, type MetObject } from './met-object.js';
import { dimensionLines, normaliseObject, orNull, yearOrNull } from './normalise.js';
import melencolia from './fixtures/336228-melencolia-i.json' with { type: 'json' };
import rhinoceros from './fixtures/356497-the-rhinoceros.json' with { type: 'json' };
import theLetter from './fixtures/352204-the-letter-not-public-domain.json' with { type: 'json' };
import tenBamboo from './fixtures/63372-ten-bamboo-studio-no-artist.json' with { type: 'json' };
import cartouches from './fixtures/341910-cartouches-undated.json' with { type: 'json' };

/** Real responses, saved on 5 October 2026, read through the same schema the client uses. */
const fixture = (json: unknown): MetObject => metObjectSchema.parse(json);

describe('normaliseObject', () => {
  it('turns a full record into the catalog shape, empty strings into null', () => {
    expect(normaliseObject(fixture(melencolia))).toEqual({
      objectId: 336228,
      title: 'Melencolia I',
      artist: {
        name: 'Albrecht Dürer',
        bio: 'German, Nuremberg 1471–1528 Nuremberg',
        nationality: 'German',
        beginYear: 1471,
        endYear: 1528,
      },
      date: { display: '1514', beginYear: 1514, endYear: 1514 },
      medium: 'Engraving',
      dimensions: ['Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)'],
      classification: 'Prints',
      department: 'Drawings and Prints',
      culture: null,
      period: null,
      creditLine: 'Harris Brisbane Dick Fund, 1943',
      accessionNumber: '43.106.1',
      objectUrl: 'https://www.metmuseum.org/art/collection/search/336228',
      tags: ['Contemplation', 'Putti', 'Dogs', 'Geometry'],
    });
  });

  it('splits dimensions on CRLF, one entry per element', () => {
    expect(rhinoceros.dimensions).toContain('\r\n');
    expect(normaliseObject(fixture(rhinoceros)).dimensions).toEqual([
      'image: 8 3/8 x 11 5/8 in. (21.3 x 29.5 cm) trimmed to block line except at top',
      'sheet: 9 3/8 x 11 3/4 in. (23.8 x 29.9 cm)',
    ]);
  });

  it('has no artist when The Met names none, and reads null constituents and tags', () => {
    const raw = fixture(tenBamboo);
    expect(raw.constituents).toBeNull();
    expect(raw.tags).toBeNull();
    const work = normaliseObject(raw);
    expect(work.artist).toBeNull();
    expect(work.tags).toEqual([]);
    expect(work.date.display).toBe('first edition printed in 1633');
  });

  it('reads "n.d." as no date, and keeps the years the record still carries', () => {
    expect(normaliseObject(fixture(cartouches)).date).toEqual({
      display: null,
      beginYear: 1495,
      endYear: 1987,
    });
  });

  it('gives null years to a record whose date is empty and whose years are both zero', () => {
    const raw = { ...fixture(melencolia), objectDate: '', objectBeginDate: 0, objectEndDate: 0 };
    expect(normaliseObject(raw).date).toEqual({ display: null, beginYear: null, endYear: null });
  });

  it('keeps what the record says of a work that is not public domain; refusing it is the importer’s call', () => {
    const raw = fixture(theLetter);
    expect(raw.isPublicDomain).toBe(false);
    expect(raw.primaryImage).toBe('');
    expect(normaliseObject(raw).artist?.name).toBe('Mary Cassatt');
  });

  it('drops empty and repeated tags', () => {
    const raw = fixture(melencolia);
    const tags = [
      { term: 'Dogs', AAT_URL: null, Wikidata_URL: null },
      { term: ' ', AAT_URL: null, Wikidata_URL: null },
      { term: 'Dogs', AAT_URL: '', Wikidata_URL: '' },
    ];
    expect(normaliseObject({ ...raw, tags }).tags).toEqual(['Dogs']);
  });

  it('refuses a record with no title or no object URL', () => {
    expect(() => normaliseObject({ ...fixture(melencolia), title: ' ' })).toThrow(MetResponseError);
    expect(() => normaliseObject({ ...fixture(melencolia), objectURL: '' })).toThrow('object URL');
  });
});

describe('the field readers', () => {
  it('orNull trims, and empties become null', () => {
    expect(orNull('')).toBeNull();
    expect(orNull('   ')).toBeNull();
    expect(orNull(' Prints ')).toBe('Prints');
  });

  it('yearOrNull reads whole years and nothing else', () => {
    expect(yearOrNull('1471')).toBe(1471);
    expect(yearOrNull('-900')).toBe(-900);
    expect(yearOrNull('')).toBeNull();
    expect(yearOrNull('ca. 1600')).toBeNull();
    expect(yearOrNull('99999')).toBeNull();
  });

  it('dimensionLines splits on any line break and drops blank lines', () => {
    expect(dimensionLines('a\r\nb\nc\rd')).toEqual(['a', 'b', 'c', 'd']);
    expect(dimensionLines(' plate \r\n\r\n sheet ')).toEqual(['plate', 'sheet']);
    expect(dimensionLines('')).toEqual([]);
  });
});
