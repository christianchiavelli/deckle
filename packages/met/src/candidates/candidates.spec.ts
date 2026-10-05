import { describe, expect, it } from 'vitest';
import melencolia from '../api/fixtures/336228-melencolia-i.json' with { type: 'json' };
import theLetter from '../api/fixtures/352204-the-letter-not-public-domain.json' with { type: 'json' };
import type { ImageProbe } from '../api/collection-client.js';
import { MetNotFoundError } from '../api/errors.js';
import { metObjectSchema, type MetObject } from '../api/met-object.js';
import { describeCandidates, searchQuery } from './candidates.js';

describe('searchQuery', () => {
  it('asks for works with images, from the options given', () => {
    expect(
      searchQuery({
        q: 'Hokusai',
        department: '6',
        medium: 'Prints|Woodblock print',
        from: '1800',
        to: '1850',
        artist: true,
        title: false,
        offset: '25',
        limit: '50',
      }),
    ).toEqual({
      hasImages: true,
      q: 'Hokusai',
      departmentId: 6,
      medium: ['Prints', 'Woodblock print'],
      dates: { begin: 1800, end: 1850 },
      artistOrCulture: true,
      offset: 25,
      limit: 50,
    });
  });

  it('pages 25 at a time from the start, and needs both years for a date range', () => {
    expect(searchQuery({ from: '1800' })).toEqual({ hasImages: true, offset: 0, limit: 25 });
  });
});

describe('describeCandidates', () => {
  const records = new Map<number, MetObject>([
    [336228, metObjectSchema.parse(melencolia)],
    [352204, metObjectSchema.parse(theLetter)],
  ]);
  const probe: ImageProbe = {
    storedWidth: 2820,
    storedHeight: 3561,
    orientation: 1,
    width: 2820,
    height: 3561,
    bytes: 4_391_204,
    requests: 1,
  };
  const client = {
    object: (objectId: number) => {
      const record = records.get(objectId);
      if (record) return Promise.resolve(record);
      if (objectId === 101039) {
        return Promise.reject(new MetNotFoundError('objects/101039', 'withdrawn'));
      }
      return Promise.reject(new Error('the network is down'));
    },
    probeImage: () => Promise.resolve(probe),
  };

  it('writes a line per sellable candidate, counts the rest and names the withdrawn', async () => {
    const lines: string[] = [];
    await describeCandidates(client, [336228, 352204, 101039], (line) => lines.push(line));
    expect(lines).toEqual([
      '336228\tA3\t2820x3561\t4.4MB\t1514\tAlbrecht Dürer (Artist)\tPrints\tEngraving\tMelencolia I',
      '101039\twithdrawn',
      '# 1 skipped: not public domain or no open-access image',
    ]);
  });

  it('lets any other failure through', async () => {
    await expect(describeCandidates(client, [1], () => undefined)).rejects.toThrow(
      'the network is down',
    );
  });
});
