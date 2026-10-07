import { expect, test } from '@playwright/test';
import { expectAccessible } from '../support/accessibility.js';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';

/** Every page this file checks, each audited by axe in both themes. */
const pages = [
  ['the prints', '/prints', 'The prints'],
  ['the prints narrowed', '/prints?technique=etchings&century=18th-century', 'The prints'],
  ['the collections', '/collections', 'Collections'],
  ['a collection', '/collections/durer-in-copper-and-wood', 'Dürer in copper and wood'],
  ['the journal', '/journal', 'Journal'],
  ['how prints are sized', '/about/sizes', 'How we size prints'],
  ['a search', '/search?q=durer', 'Prints for “durer”'],
  ['a search that finds nothing', '/search?q=monet', 'No prints for “monet”'],
  ['a missing page', '/no-such-page', 'This page is not here'],
] as const;

test.describe('the pages to browse by', () => {
  for (const [name, path, heading] of pages) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${name} pass axe in the ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`${store}${path}`);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        await expectAccessible(page);
      });
    }
  }
});

test.describe('the header', () => {
  // Without scripts, what the server sent is all there is.
  test.use({ javaScriptEnabled: false });

  test('marks the section a page is in, from the first byte', async ({ page }) => {
    const current = page.getByRole('navigation', { name: 'Shop' }).locator('[aria-current="page"]');
    for (const [path, section] of [
      ['/prints', 'Prints'],
      ['/prints/melencolia-i', 'Prints'],
      ['/collections', 'Collections'],
      ['/collections/durer-in-copper-and-wood', 'Collections'],
      ['/journal', 'Journal'],
    ] as const) {
      await page.goto(`${store}${path}`);
      await expect(current, path).toHaveText(section);
    }
    for (const path of ['/', '/search?q=durer', '/about/sizes']) {
      await page.goto(`${store}${path}`);
      await expect(current, path).toHaveCount(0);
    }
  });
});

test.describe('the links', () => {
  test('lead to a page, every one the store shows', async ({ page, request }) => {
    const hrefs = new Set<string>();
    for (const path of ['/', '/prints/melencolia-i', ...pages.map(([, path]) => path)]) {
      await page.goto(`${store}${path}`);
      const found = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      for (const href of found) {
        hrefs.add(href.replace(/#.*$/, ''));
      }
    }
    const broken: string[] = [];
    for (const href of hrefs) {
      const response = await request.get(`${store}${href}`);
      if (!response.ok()) {
        broken.push(`${href} answers ${String(response.status())}`);
      }
    }
    // The pages link every print, so this follows more than fifty links.
    expect(hrefs.size).toBeGreaterThan(50);
    expect(broken).toEqual([]);
  });
});

test.describe('the prints', () => {
  test('lists every print oldest first, and narrows them by a choice the address keeps', async ({
    page,
  }) => {
    await page.goto(`${store}/prints`);
    await expect(page.getByText('48 prints, oldest first')).toBeVisible();
    const prints = page.getByRole('region', { name: 'The prints' }).locator('a[href^="/prints/"]');
    await expect(prints).toHaveCount(48);
    await expect(prints.first()).toContainText('Saint Anthony Tormented by Demons');

    const filters = page.getByRole('navigation', { name: 'Filter the prints' });
    await filters.getByRole('link', { name: /^Etchings 8 prints$/ }).click();
    await expect(page).toHaveURL(/\/prints\?technique=etchings$/);
    await expect(page.getByText('8 prints of 48, oldest first')).toBeVisible();
    await expect(filters.getByRole('link', { name: /^Etchings/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    // Each count is what a click shows, within the other choices.
    await filters.getByRole('link', { name: /^18th 4 prints$/ }).click();
    await expect(page).toHaveURL(/technique=etchings&century=18th-century/);
    await expect(page.getByText('4 prints of 48, oldest first')).toBeVisible();

    await page.getByRole('link', { name: 'Clear the filters' }).click();
    await expect(page.getByText('48 prints, oldest first')).toBeVisible();
  });

  test('shows every print to an address it cannot read', async ({ page }) => {
    await page.goto(`${store}/prints?technique=pastels&size=a9`);
    await expect(page.getByText('48 prints, oldest first')).toBeVisible();
  });
});

test.describe('the collections', () => {
  test('lists the editor’s collections, each leading to its prints', async ({ page }) => {
    await page.goto(`${store}/collections`);
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'Dürer in copper and wood',
      'Monsters and dreams',
      'Rain, snow and fireworks',
      'Thirty-six Views of Mount Fuji',
    ]);

    await page.getByRole('link', { name: 'See the 4 prints' }).first().click();
    await expect(page).toHaveURL(/\/collections\/durer-in-copper-and-wood$/);
    const collection = page.getByRole('region', { name: 'Dürer in copper and wood' });
    await expect(collection.locator('a[href^="/prints/"]')).toHaveCount(4);
    await expect(
      page.getByRole('region', { name: 'More collections' }).getByRole('listitem'),
    ).toHaveCount(3);
  });

  test('has no page for the front page’s own selection', async ({ page }) => {
    await page.goto(`${store}/collections/first-impressions`);
    await expect(page.getByRole('heading', { name: 'This page is not here' })).toBeVisible();
  });
});

test.describe('the journal', () => {
  test('opens with the newest story, and leads each one to its print', async ({ page }) => {
    await page.goto(`${store}/journal`);
    const lead = page.getByRole('link', { name: /About the engraving\s*Melencolia I/ });
    await expect(lead).toHaveAttribute('href', '/prints/melencolia-i#story');
    await expect(
      page.getByRole('region', { name: 'More stories' }).getByRole('listitem'),
    ).toHaveCount(11);

    await lead.click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'About the engraving' }),
    ).toBeInViewport();
  });
});

test.describe('how prints are sized', () => {
  test('explains the limit with three scans and the table the shop sells by', async ({ page }) => {
    await page.goto(`${store}/about/sizes`);
    const examples = page.getByRole('region', { name: 'Three scans, three limits' });
    await expect(examples.getByRole('listitem')).toHaveCount(3);
    await expect(examples).toContainText('A4 only');
    await expect(examples).toContainText(
      'The Met’s scan is 1,566 × 2,006 px. A3 would need 2,240 px across the image; the scan has 1,566.',
    );
    await expect(examples).toContainText('Up to A2');

    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(4)).toContainText('4,668 × 7,002 px');
    await expect(page.getByText(/large enough for A1\.$/)).toBeVisible();
  });
});

test.describe('the search', () => {
  test('takes the key its hint shows, from anywhere on the page', async ({ page }) => {
    await page.goto(`${store}/prints`);
    await page.keyboard.press('/');
    await expect(page.getByRole('banner').getByRole('searchbox')).toBeFocused();
  });

  test('forgives a typo, and finds a word by its start', async ({ page }) => {
    await page.goto(`${store}/search?q=melancolia`);
    await expect(page.getByRole('link', { name: /Melencolia I/ })).toBeVisible();
    await page.goto(`${store}/search?q=rembr`);
    await expect(page.getByText('2 prints', { exact: true })).toBeVisible();
  });

  test('finds a maker without the accent, and says so when nothing matches', async ({ page }) => {
    await page.goto(`${store}/`);
    await page.getByRole('searchbox').first().fill('durer');
    await page.getByRole('searchbox').first().press('Enter');
    await expect(page).toHaveURL(/\/search\?q=durer$/);
    await expect(page.getByText('4 prints', { exact: true })).toBeVisible();

    const again = page.getByRole('search', { name: 'Search again' }).getByRole('searchbox');
    await expect(again).toHaveValue('durer');
    await again.fill('monet');
    await again.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1, name: 'No prints for “monet”' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Hokusai' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Prints for “Hokusai”' }),
    ).toBeVisible();
  });
});

test.describe('the front page', () => {
  test('ends with three collections and the three newest stories', async ({ page }) => {
    await page.goto(`${store}/`);
    const collections = page.getByRole('region', { name: 'Collections' });
    await expect(collections.getByRole('listitem')).toHaveCount(3);
    await expect(collections.getByRole('listitem').first().getByRole('link')).toHaveAttribute(
      'href',
      '/collections/durer-in-copper-and-wood',
    );
    const journal = page.getByRole('region', { name: 'From the journal' });
    await expect(journal.getByRole('listitem')).toHaveCount(3);
    await expect(journal.getByRole('listitem').first()).toContainText('Melencolia I');
  });
});

test.describe("a work's page", () => {
  test('places the work among the prints, and finds more by its maker', async ({ page }) => {
    await page.goto(`${store}/prints/melencolia-i`);
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'Engravings' })).toHaveAttribute(
      'href',
      '/prints?technique=engravings',
    );

    await page.getByRole('link', { name: 'Albrecht Dürer', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=Albrecht%20D%C3%BCrer$/);
    await expect(page.getByText('4 prints', { exact: true })).toBeVisible();
  });
});
