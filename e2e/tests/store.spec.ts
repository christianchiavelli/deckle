import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';
const adminApi = process.env['ADMIN_API_URL'] ?? 'http://localhost:8082/admin-api';
const username = process.env['COMMERCE_SUPERADMIN_USERNAME'] ?? 'superadmin';
const password = process.env['COMMERCE_SUPERADMIN_PASSWORD'] ?? 'deckle-superadmin';

/** Fails on any WCAG A or AA violation axe finds on the page as it stands. */
async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

test.describe('the front page', () => {
  test('says what Deckle is, with the prints the editor chose and their prices', async ({
    page,
  }) => {
    await page.goto(`${store}/`);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Prints from The Met, at the sizes their scans can hold',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/^\d+ works from the museum’s Open Access collection/),
    ).toBeVisible();

    const prints = page.getByRole('region', { name: 'The prints' });
    await expect(prints.getByRole('listitem')).toHaveCount(8);
    await expect(prints.getByRole('link', { name: /The Rhinoceros/ })).toHaveAttribute(
      'href',
      '/prints/the-rhinoceros',
    );
    await expect(prints.getByText(/^From \$\d+/).first()).toBeVisible();

    const sizing = page.getByRole('region', { name: 'How large can a print be?' });
    await expect(sizing).toContainText('The Met’s scan of Melencolia I is 2,820 pixels across');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`passes axe in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${store}/`);
      await expect(page.getByRole('region', { name: 'The prints' })).toBeVisible();
      await expectAccessible(page);
    });
  }
});

test.describe("a work's page", () => {
  test('sells the sizes the scan can hold, at their prices', async ({ page }) => {
    await page.goto(`${store}/prints/melencolia-i`);
    await expect(page.getByRole('heading', { level: 1, name: 'Melencolia I' })).toBeVisible();
    await expect(page.getByText('1514 · Engraving · Plate 24 × 18.5 cm')).toBeVisible();

    // A3 first, and the price follows the size chosen once the page is interactive.
    await expect(page.getByText('A3, unframed')).toBeVisible();
    // The radio is visually hidden inside its tile, which is what a visitor clicks.
    const a4 = page.getByRole('radio', { name: /^A4/ });
    await page.locator('label', { has: a4 }).click();
    await expect(a4).toBeChecked();
    await expect(page.getByText('A4, unframed')).toBeVisible();
    await expect(
      page.getByText('Printed at 447 ppi on A4, from the museum’s own scan'),
    ).toBeVisible();

    await expect(page.getByRole('radio', { name: /^A2/ })).toBeDisabled();
    await expect(
      page.getByText(
        'A2 would need 3,213 px across the image. The Met’s scan has 2,820, and we never upscale.',
      ),
    ).toBeVisible();
  });

  test("shows the story, the museum's record and more prints", async ({ page }) => {
    await page.goto(`${store}/prints/melencolia-i`);
    await expect(
      page.getByRole('heading', { level: 2, name: 'About the engraving' }),
    ).toBeVisible();
    const record = page.getByRole('region', { name: 'From the museum’s record' });
    await expect(record).toContainText('Harris Brisbane Dick Fund, 1943');
    await expect(record).toContainText('2,820 × 3,561 px, read from the file');
    await expect(
      page.getByRole('region', { name: 'More prints' }).getByRole('listitem'),
    ).toHaveCount(4);
  });

  test('keeps its CSS when the content replaces the loading state', async ({ page }) => {
    // The product band renders in the Suspense fallback and again in the content:
    // the styled-components bug the prerelease fixes (ADR 0007) dropped its CSS there.
    await page.goto(`${store}/prints/melencolia-i`);
    const product = page.getByRole('region', { name: 'Melencolia I' });
    await expect(product).toBeVisible();
    await expect(product).not.toHaveCSS('padding-top', '0px');
    await expect(page.getByRole('img', { name: /^Melencolia I/ })).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`passes axe in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${store}/prints/melencolia-i`);
      await expect(page.getByRole('heading', { level: 1, name: 'Melencolia I' })).toBeVisible();
      await expectAccessible(page);
    });
  }

  test('says so when the shop has no such print', async ({ page }) => {
    await page.goto(`${store}/prints/no-such-print`);
    await expect(page.getByRole('heading', { name: 'This page is not here' })).toBeVisible();
  });
});

test.describe('the theme switch', () => {
  test('keeps the choice across pages, from before the first paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${store}/`);
    await page.getByRole('button', { name: 'Theme' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.goto(`${store}/prints/melencolia-i`);
    // Set by the script in the head, so the page never paints in the other theme.
    expect(await page.evaluate(() => document.documentElement.dataset['theme'])).toBe('dark');
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  });
});

/** The Admin API in the superadmin's session: the request context keeps its cookie. */
async function adminQuery<T>(
  request: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await request.post(adminApi, { data: { query, variables } });
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!body.data || body.errors) {
    throw new Error(`Admin API: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

test.describe('the cache', () => {
  test('shows a new price at once, without waiting for the cache to age', async ({
    page,
    request,
  }) => {
    const work = `${store}/prints/saint-jerome-in-his-study`;
    await adminQuery(
      request,
      `mutation($u: String!, $p: String!) { login(username: $u, password: $p) { __typename } }`,
      {
        u: username,
        p: password,
      },
    );
    const { productVariants } = await adminQuery<{
      productVariants: { items: { id: string; price: number }[] };
    }>(
      request,
      '{ productVariants(options: { filter: { sku: { eq: "391257-A3" } } }) { items { id price } } }',
    );
    const [variant] = productVariants.items;
    if (!variant) {
      throw new Error('No A3 of Saint Jerome in His Study in commerce');
    }
    const setPrice = (price: number) =>
      adminQuery(
        request,
        'mutation($input: [UpdateProductVariantInput!]!) { updateProductVariants(input: $input) { id } }',
        { input: [{ id: variant.id, price }] },
      );

    // The page is cached before the change, so only an invalidation can show the new price.
    await page.goto(work);
    await expect(page.getByText('A3, unframed')).toBeVisible();
    const changed = variant.price + 1700;
    try {
      await setPrice(changed);
      await expect(async () => {
        await page.goto(work);
        await expect(page.getByText('A3, unframed')).toBeVisible();
        await expect(page.getByRole('region', { name: 'Saint Jerome in His Study' })).toContainText(
          `$${String(changed / 100)}`,
          { timeout: 1000 },
        );
      }).toPass({ timeout: 30_000 });
    } finally {
      await setPrice(variant.price);
    }
  });
});
