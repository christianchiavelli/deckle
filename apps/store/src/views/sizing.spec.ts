import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { greatWave, melencolia } from '../test/works';
import { sizingOf } from './sizing';

describe('sizingOf', () => {
  it("explains the largest sheet from the scan's own pixels", () => {
    expect(sizingOf(melencolia, copy)).toBe(
      'Every inch of paper needs 240 of the scan’s pixels, or fine lines start to soften at arm’s length. The Met’s scan of Melencolia I is 2,820 pixels across: enough for A3 at 302 ppi. A2 would need 3,213, so we print it up to A3 and no larger.',
    );
  });

  it('counts the side the next sheet runs short on', () => {
    expect(sizingOf(greatWave, copy)).toContain(
      'The Met’s scan of Under the Wave off Kanagawa is 2,594 pixels tall: enough for A3 at 278 ppi.',
    );
  });

  it('says when the scan fills the largest sheet there is', () => {
    const every = melencolia.sizes.map((size) => ({
      ...size,
      available: true,
      requiredPixels: null,
      unavailableReason: null,
    }));
    expect(sizingOf({ ...melencolia, sizes: every }, copy)).toMatch(
      /enough for A1 at 144 ppi\. That is the largest sheet we print\.$/,
    );
    const unmeasured = melencolia.sizes.map((size) => ({ ...size, requiredPixels: null }));
    expect(sizingOf({ ...melencolia, sizes: unmeasured }, copy)).toMatch(
      /That is the largest sheet we print\.$/,
    );
  });

  it('has nothing to explain without a picture or a size for sale', () => {
    expect(sizingOf({ ...melencolia, image: null }, copy)).toBeNull();
    const none = melencolia.sizes.map((size) => ({ ...size, available: false }));
    expect(sizingOf({ ...melencolia, sizes: none }, copy)).toBeNull();
  });
});
