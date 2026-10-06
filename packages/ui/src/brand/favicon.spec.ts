import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { copper, copperFrom } from './copper.ts';
import { favicon } from './favicon.ts';
import { seal } from './seal.ts';

describe('favicon', () => {
  it('draws the seal in the light copper, and in the dark copper for a dark tab strip', () => {
    const svg = favicon({ light: 'paper-copper', dark: 'ink-copper' });
    expect(svg).toContain(`d="${seal}"`);
    expect(svg).toContain('path { fill: paper-copper }');
    expect(svg).toContain('@media (prefers-color-scheme: dark) { path { fill: ink-copper } }');
  });

  it('takes both coppers from the token build', () => {
    const { light, dark } = copper();
    expect(light).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark).toMatch(/^#[0-9a-f]{6}$/);
    expect(light).not.toBe(dark);
  });

  it('refuses a token build without the accent', () => {
    expect(() => copperFrom([])).toThrow(/accent.default/);
  });

  it('is committed as the generator writes it', async () => {
    const committed = await readFile(new URL('../../brand/favicon.svg', import.meta.url), 'utf8');
    expect(committed).toBe(favicon(copper()));
  });
});
