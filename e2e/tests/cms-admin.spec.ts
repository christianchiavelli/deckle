import { expect, test } from '@playwright/test';
import { cms, editor } from '../support/cms.js';

test.describe("Payload admin in Deckle's brand", () => {
  test("signs in under Deckle's mark, in the store's typeface", async ({ page, request }) => {
    await page.goto(`${cms}/admin/login`);
    // The Logo in admin.components.graphics, where Payload's would be.
    await expect(page.getByText('Deckle', { exact: true })).toBeVisible();
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
    await expect(page.locator('body')).toHaveCSS('font-family', /^"?Host Grotesk/);
    // Without its contextual alternate, which would draw the X of an order code as ×.
    await expect(page.locator('body')).toHaveCSS('font-variant-ligatures', 'no-contextual');

    const favicon = await request.get(`${cms}/favicon.svg`);
    expect(favicon.headers()['content-type']).toBe('image/svg+xml');
  });
});

test.describe('Payload admin in Brazilian Portuguese', () => {
  // Payload picks the admin's language from the browser's, as it does for an editor.
  test.use({ locale: 'pt-BR' });

  test('shows a story with our labels and a date written the Brazilian way', async ({ page }) => {
    await page.goto(`${cms}/admin/login`);
    await page.getByRole('textbox', { name: /E-?mail/ }).fill(editor.email);
    await page.getByRole('textbox', { name: 'Senha' }).fill(editor.password);
    // Payload's Portuguese keeps the English word on this one button.
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(
      page.getByRole('complementary').getByRole('link', { name: 'Histórias' }),
    ).toBeVisible();

    await page.goto(`${cms}/admin/collections/stories`);
    // A search, as an editor would: the seeded stories run past the list's first page.
    await page.getByRole('textbox', { name: 'Buscar por Slug da obra' }).fill('melencolia-i');
    // The list puts the search in its address a moment later, which would undo an earlier click.
    await expect(page).toHaveURL(/[?&]search=melencolia-i/);
    await page.getByRole('link', { name: 'melencolia-i' }).click();

    await expect(page.getByRole('textbox', { name: /^Slug da obra/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Abertura/ })).toBeVisible();
    // "5 de out de 2026, 23:46": day first, 24-hour clock, no English ordinal.
    await expect(
      page.getByText(/^\d{1,2} de [a-zç]{3} de \d{4}, \d{2}:\d{2}$/).first(),
    ).toBeVisible();
  });
});
