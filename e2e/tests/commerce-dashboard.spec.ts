import { expect, test, type Page } from '@playwright/test';

const dashboard = process.env['DASHBOARD_URL'] ?? 'http://localhost:8082/dashboard';
const username = process.env['COMMERCE_SUPERADMIN_USERNAME'] ?? 'superadmin';
const password = process.env['COMMERCE_SUPERADMIN_PASSWORD'] ?? 'deckle-superadmin';

test.describe("Vendure dashboard in Deckle's brand", () => {
  test("signs in under Deckle's mark, in the store's typeface", async ({ page }) => {
    // The port's root leads to the dashboard, as the CMS's leads to its admin.
    await page.goto(new URL('/', dashboard).href);
    await expect(page).toHaveURL(/\/dashboard\/login/);
    // DashboardBrandPlugin's lockup, where Vendure's logo would be.
    await expect(page.getByText('Deckle', { exact: true })).toBeVisible();
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('type', 'image/svg+xml');
    await expect(page.locator('body')).toHaveCSS('font-family', /^"?Host Grotesk/);
    // Without its contextual alternate, which would draw the X of an order code as ×.
    await expect(page.locator('body')).toHaveCSS('font-variant-ligatures', 'no-contextual');
  });
});

test.describe('Vendure dashboard in Brazilian Portuguese', () => {
  test.beforeEach(async ({ page }) => {
    // The display language is a setting the dashboard keeps in local storage.
    await page.addInitScript(() => {
      localStorage.setItem('vendure-user-settings', JSON.stringify({ displayLanguage: 'pt_BR' }));
    });
  });

  async function signIn(page: Page): Promise<void> {
    await page.goto(`${dashboard}/login`);
    await page.getByRole('textbox', { name: 'E-mail' }).fill(username);
    await page.getByRole('textbox', { name: 'Senha' }).fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Catálogo' })).toBeVisible();
  }

  // Unpatched, the dashboard hands Intl "pt_BR" and the product page fails with
  // "Invalid language tag": see patchedDependencies in pnpm-workspace.yaml.
  test('opens a product, with our fields labelled and prices formatted for Brazil', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`${dashboard}/products`);
    await page.getByPlaceholder(/^Filtrar/).fill('Melencolia');
    await page.getByRole('button', { name: 'Melencolia I', exact: true }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Melencolia I' })).toBeVisible();
    await expect(page.getByText('ID do objeto no Met')).toBeVisible();
    await expect(page.getByText('US$ 55,00').first()).toBeVisible();
    await expect(page.getByText(/Invalid language tag/)).toHaveCount(0);
  });

  test.describe('three hours behind UTC, as in Brazil', () => {
    test.use({ timezoneId: 'America/Sao_Paulo' });

    // Unpatched, the order chart counted the server's days, so this month began on the
    // last day of the one before, and its value axis cut "US$ 1.000" to "S$ 1.000".
    test("charts this month by the browser's days, every label whole", async ({ page }) => {
      await signIn(page);
      const chart = page.locator('.recharts-wrapper').first();
      await expect(chart).toBeVisible();

      const now = new Date();
      const month = (part: 'year' | 'month') =>
        Number(
          new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', [part]: 'numeric' })
            .formatToParts(now)
            .find((each) => each.type === part)?.value,
        );
      const firstOfMonth = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        month: 'short',
        day: 'numeric',
      }).format(Date.UTC(month('year'), month('month') - 1, 1, 15));
      await expect(
        chart.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value').first(),
      ).toHaveText(firstOfMonth);

      const left = (await chart.boundingBox())?.x ?? Infinity;
      const values = chart.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value');
      await expect(values.first()).toBeVisible();
      for (const value of await values.all()) {
        expect((await value.boundingBox())?.x).toBeGreaterThanOrEqual(left);
      }
    });
  });
});
