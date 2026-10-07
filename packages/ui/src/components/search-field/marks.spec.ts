import { describe, expect, it } from 'vitest';
import { markStarts } from './marks.ts';

const marked = (text: string, query: string) =>
  markStarts(text, query)
    .map((run) => (run.marked ? `[${run.text}]` : run.text))
    .join('');

describe('markStarts', () => {
  it('marks the opening of each word a typed word starts', () => {
    expect(marked('Albrecht Dürer', 'alb')).toBe('[Alb]recht Dürer');
    expect(marked('Albrecht Dürer', 'dür alb')).toBe('[Alb]recht [Dür]er');
  });

  it('sets accents and case aside, and marks the characters as written', () => {
    expect(marked('Sudden Shower over Shin-Ōhashi Bridge', 'ohashi')).toBe(
      'Sudden Shower over Shin-[Ōhashi] Bridge',
    );
    expect(marked('Albrecht Dürer', 'DURER')).toBe('Albrecht [Dürer]');
  });

  it('marks the longest of the typed words that fits', () => {
    expect(marked('Melencolia I', 'm melencolia')).toBe('[Melencolia] I');
  });

  it('marks no letters inside a word, and nothing for a typo or for nothing typed', () => {
    expect(marked('Woodblock print', 'block')).toBe('Woodblock print');
    expect(marked('Melencolia I', 'melancolia')).toBe('Melencolia I');
    expect(marked('Melencolia I', '  ')).toBe('Melencolia I');
    expect(markStarts('', 'mel')).toEqual([]);
  });
});
