import { readFile } from 'node:fs/promises';
import foundations from '@deckle/tokens/foundations.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { copperFrom } from './copper.js';
import { favicon } from './favicon.js';
import { seal } from './seal.js';

describe('favicon', () => {
  it('draws the seal in the light copper, and in the dark copper for a dark tab strip', () => {
    const svg = favicon({ light: 'paper-copper', dark: 'ink-copper' });
    expect(svg).toContain(`d="${seal}"`);
    expect(svg).toContain('path { fill: paper-copper }');
    expect(svg).toContain('@media (prefers-color-scheme: dark) { path { fill: ink-copper } }');
  });

  it('takes both coppers from the token build', () => {
    const { light, dark } = copperFrom(foundations.colours);
    expect(light).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark).toMatch(/^#[0-9a-f]{6}$/);
    expect(light).not.toBe(dark);
  });

  it('refuses a token build without the accent', () => {
    expect(() => copperFrom([])).toThrow(/accent.default/);
  });

  it('is committed as the generator writes it', async () => {
    const committed = await readFile(new URL('../assets/favicon.svg', import.meta.url), 'utf8');
    expect(committed).toBe(favicon(copperFrom(foundations.colours)));
  });
});
