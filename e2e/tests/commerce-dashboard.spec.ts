import { expect, test } from '@playwright/test';

const dashboard = process.env['DASHBOARD_URL'] ?? 'http://localhost:8082/dashboard';
const username = process.env['COMMERCE_SUPERADMIN_USERNAME'] ?? 'superadmin';
const password = process.env['COMMERCE_SUPERADMIN_PASSWORD'] ?? 'deckle-superadmin';

test.describe('Vendure dashboard in Brazilian Portuguese', () => {
  test.beforeEach(async ({ page }) => {
    // The display language is a setting the dashboard keeps in local storage.
    await page.addInitScript(() => {
      localStorage.setItem('vendure-user-settings', JSON.stringify({ displayLanguage: 'pt_BR' }));
    });
  });

  // Unpatched, the dashboard hands Intl "pt_BR" and the product page fails with
  // "Invalid language tag": see patchedDependencies in pnpm-workspace.yaml.
  test('opens a product, with our fields labelled and prices formatted for Brazil', async ({
    page,
  }) => {
    await page.goto(`${dashboard}/login`);
    await page.getByRole('textbox', { name: 'E-mail' }).fill(username);
    await page.getByRole('textbox', { name: 'Senha' }).fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Catálogo' })).toBeVisible();

    await page.goto(`${dashboard}/products`);
    await page.getByPlaceholder(/^Filtrar/).fill('Melencolia');
    await page.getByRole('button', { name: 'Melencolia I', exact: true }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Melencolia I' })).toBeVisible();
    await expect(page.getByText('ID do objeto no Met')).toBeVisible();
    await expect(page.getByText('US$ 55,00').first()).toBeVisible();
    await expect(page.getByText(/Invalid language tag/)).toHaveCount(0);
  });
});
