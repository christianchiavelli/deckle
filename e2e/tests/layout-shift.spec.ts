import { expect, type Page, test } from '@playwright/test';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';
// compose.yaml's own: the secret in the CMS's preview links.
const previewSecret =
  process.env['PREVIEW_SECRET'] ?? 'local-only-preview-secret-not-for-production';

/**
 * Google counts a layout shift below 0.1 as good. A page here is a static shell
 * the rest streams into, so it should barely move at all: what is drawn first
 * stays where it is drawn. Half of Google's line leaves room for what ADR 0051
 * accepts, a line of text that wraps differently once the web font is in, and
 * still fails the footer that jumped, at 0.24 and up.
 */
const MOST = 0.05;

const pages = [
  ['the front page', '/'],
  ['the prints', '/prints'],
  ['a print', '/prints/melencolia-i'],
  ['the collections', '/collections'],
  ['a collection', '/collections/durer-in-copper-and-wood'],
  ['the journal', '/journal'],
  ['how prints are sized', '/about/sizes'],
  ['a search', '/search?q=durer'],
  ['the drops', '/drops'],
  ['a drop', '/drops/melencolia-i-numbered'],
  ['how drops work', '/about/drops'],
  ['the cart', '/cart'],
  ['the way in', '/account'],
  // Portuguese runs longer, so its lines wrap in other places as the fonts come in.
  ['the front page in Portuguese', '/pt-br'],
  ['a print in Portuguese', '/pt-br/prints/melencolia-i'],
  ['a drop in Portuguese', '/pt-br/drops/melencolia-i-numbered'],
  ['how prints are sized, in Portuguese', '/pt-br/about/sizes'],
] as const;

/** The part of a Layout Instability API entry this file reads. */
interface LayoutShift extends PerformanceEntry {
  readonly value: number;
  readonly hadRecentInput: boolean;
}

/**
 * Every shift the page makes as it loads, added up as Core Web Vitals does for
 * one load. A page React cannot hydrate as the server drew it is drawn again in
 * the browser, which moves it, so an error as it loads fails the page too.
 */
async function shiftAsItLoads(page: Page, path: string): Promise<number> {
  const thrown: string[] = [];
  page.on('pageerror', (error) => thrown.push(error.message));
  await page.addInitScript(() => {
    const seen: PerformanceEntry[] = [];
    const observer = new PerformanceObserver((list) => {
      seen.push(...list.getEntries());
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    // What the observer was handed, and what it holds still undelivered.
    Object.assign(window, { layoutShifts: () => [...seen, ...observer.takeRecords()] });
  });
  await page.goto(`${store}${path}`);
  // The footer shows once the page's content is in, and not before.
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const shift = await page.evaluate(async () => {
    // React reveals streamed content in batches up to 300 ms apart, so the
    // count runs for the page's first two seconds, whatever showed when.
    await new Promise((settled) => setTimeout(settled, Math.max(0, 2000 - performance.now())));
    await document.fonts.ready;
    await new Promise((settled) => requestAnimationFrame(() => requestAnimationFrame(settled)));
    const { layoutShifts } = window as unknown as { layoutShifts: () => LayoutShift[] };
    return layoutShifts()
      .filter((shift) => !shift.hadRecentInput)
      .reduce((sum, shift) => sum + shift.value, 0);
  });
  expect(thrown, `${path} threw as it loaded`).toEqual([]);
  return shift;
}

for (const [device, viewport] of [
  ['a laptop', { width: 1440, height: 900 }],
  ['a phone', { width: 390, height: 844 }],
] as const) {
  test.describe(`on ${device}`, () => {
    test.use({ viewport });

    for (const [name, path] of pages) {
      test(`${name} holds still as it loads`, async ({ page }) => {
        expect(await shiftAsItLoads(page, path)).toBeLessThan(MOST);
      });
    }

    test('a print in preview holds still behind its trial proof', async ({ page }) => {
      const link = new URLSearchParams({
        secret: previewSecret,
        type: 'story',
        slug: 'melencolia-i',
      });
      await page.goto(`${store}/api/preview?${link.toString()}`);
      await expect(page.getByRole('complementary', { name: 'Trial proof' })).toBeVisible();
      expect(await shiftAsItLoads(page, '/prints/melencolia-i')).toBeLessThan(MOST);
    });

    test('the cart holds still with a print in it', async ({ page }) => {
      await page.goto(`${store}/prints/melencolia-i`);
      await page.getByRole('button', { name: 'Add to cart' }).click();
      await expect(page.getByRole('region', { name: 'Added to your cart' })).toBeVisible();
      expect(await shiftAsItLoads(page, '/cart')).toBeLessThan(MOST);
    });
  });
}
