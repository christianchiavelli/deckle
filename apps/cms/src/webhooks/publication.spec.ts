import { describe, expect, it } from 'vitest';
import type { StorySubject } from './event';
import { publicationChanges, publicationOf, type Publication } from './publication';

const story = (artworkSlug: string): StorySubject => ({ slug: artworkSlug, artworkSlug });

const published = (subject: StorySubject, writtenAt: string): Publication<StorySubject> => ({
  subject,
  writtenAt,
});

describe('publicationOf', () => {
  it('sees a published row', () => {
    const row = { _status: 'published' as const, updatedAt: '2026-10-05T10:00:00.000Z' };
    expect(publicationOf(row, () => story('melencolia-i'))).toEqual(
      published(story('melencolia-i'), '2026-10-05T10:00:00.000Z'),
    );
  });

  it.each([['draft' as const], [null], [undefined]])('sees nothing in a %s row', (status) => {
    const row = { _status: status, updatedAt: '2026-10-05T10:00:00.000Z' };
    expect(publicationOf(row, () => story('melencolia-i'))).toBeNull();
  });
});

describe('publicationChanges', () => {
  const before = published(story('the-rhinoceros'), '2026-10-05T10:00:00.000Z');

  it('reports a first publication as created', () => {
    expect(publicationChanges(null, before)).toEqual([
      { action: 'created', subject: story('the-rhinoceros') },
    ]);
  });

  it('reports nothing for a draft that is still a draft', () => {
    expect(publicationChanges(null, null)).toEqual([]);
  });

  it('reports nothing for a draft saved over published content, autosaves included', () => {
    // A draft save never touches the published row, so it is still the same write.
    const after = published(story('the-rhinoceros'), '2026-10-05T10:00:00.000Z');
    expect(publicationChanges(before, after)).toEqual([]);
  });

  it('reports a published edit as updated', () => {
    const after = published(story('the-rhinoceros'), '2026-10-05T11:30:00.000Z');
    expect(publicationChanges(before, after)).toEqual([
      { action: 'updated', subject: story('the-rhinoceros') },
    ]);
  });

  it('reports an unpublish or a delete as deleted', () => {
    expect(publicationChanges(before, null)).toEqual([
      { action: 'deleted', subject: story('the-rhinoceros') },
    ]);
  });

  it('reports a published slug change as a deletion and a creation', () => {
    const after = published(story('rhinoceros'), '2026-10-05T11:30:00.000Z');
    expect(publicationChanges(before, after)).toEqual([
      { action: 'deleted', subject: story('the-rhinoceros') },
      { action: 'created', subject: story('rhinoceros') },
    ]);
  });

  it('compares subjects by every field', () => {
    const page = (slug: string) => ({ slug });
    const first = { subject: page('first-light'), writtenAt: '1' };
    expect(publicationChanges(first, { subject: page('first-light'), writtenAt: '2' })).toEqual([
      { action: 'updated', subject: page('first-light') },
    ]);
    const wider = { subject: { slug: 'first-light', extra: 'x' }, writtenAt: '2' };
    expect(publicationChanges<Record<string, string>>(first, wider)).toHaveLength(2);
  });
});
