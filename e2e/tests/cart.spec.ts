import { expect, type Page, test } from '@playwright/test';
import { expectAccessible } from '../support/accessibility.js';
import { receiptFor } from '../support/mailpit.js';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';

/** An address no other run has used, so its receipt is this run's alone. */
const freshEmail = () =>
  `ana.${String(Date.now())}.${String(Math.random()).slice(2, 8)}@example.com`;

async function addMelencolia(page: Page) {
  await page.goto(`${store}/prints/melencolia-i`);
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('region', { name: 'Added to your cart' })).toBeVisible();
}

async function fillAddress(page: Page, email: string) {
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Full name' }).fill('Ana Souza');
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('1000 Fifth Avenue');
  await page.getByRole('textbox', { name: 'City' }).fill('New York');
  await page.getByRole('textbox', { name: 'Postcode' }).fill('10028');
}

test.describe('the cart', () => {
  test('takes a print from its page, and says so under the header', async ({ page }) => {
    await addMelencolia(page);
    const sheet = page.getByRole('region', { name: 'Added to your cart' });
    await expect(sheet).toContainText('Melencolia I');
    await expect(sheet).toContainText('A3, unframed · $90');
    await expect(sheet).toContainText('1 print in your cart · $90');
    await expect(page.getByRole('link', { name: 'Cart, 1 print' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('changes how many of a print, removes it, and sums as it goes', async ({ page }) => {
    await addMelencolia(page);
    await page.getByRole('link', { name: 'View cart' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible();

    await page.getByRole('button', { name: 'One more' }).click();
    const summary = page.getByRole('complementary', { name: 'Order summary' });
    await expect(summary).toContainText('Subtotal, 2 prints');
    await expect(summary).toContainText('$180');
    await expect(summary).toContainText('$192');
    await expect(page.getByRole('link', { name: 'Cart, 2 prints' })).toBeVisible();

    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your cart is empty' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse the prints' })).toBeVisible();
  });

  test('places the order as a guest, and the receipt goes to the address given', async ({
    page,
  }) => {
    const email = freshEmail();
    await addMelencolia(page);
    await page.getByRole('link', { name: 'Check out' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();

    // Sent empty, every field that needs filling says so, and the first takes focus.
    await page.getByRole('button', { name: /^Place order · \$102$/ }).click();
    const emailField = page.getByRole('textbox', { name: 'Email' });
    await expect(emailField).toBeFocused();
    await expect(emailField).toHaveAccessibleDescription(
      'Enter an email address, such as you@example.com',
    );
    await expect(page.getByRole('textbox', { name: 'City' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await fillAddress(page, email);
    await page.getByRole('button', { name: /^Place order/ }).click();

    await expect(page).toHaveURL(/\/orders\/[A-Z0-9]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Thank you, Ana' })).toBeVisible();
    await expect(page.getByText(`its receipt is on its way to ${email}`)).toBeVisible();
    const summary = page.getByRole('complementary', { name: /^Order / });
    await expect(summary).toContainText('Ana Souza, 1000 Fifth Avenue, New York 10028');
    await expect(summary).toContainText('$102');
    // The cart is gone with the order.
    await expect(page.getByRole('link', { name: 'Cart, 0 prints' })).toBeVisible();

    const code = page.url().split('/').at(-1) ?? '';
    expect(await receiptFor(email)).toContain(code);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`passes axe with a print in it, and at checkout, in the ${scheme} theme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await addMelencolia(page);
      await page.goto(`${store}/cart`);
      await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
      await expectAccessible(page);

      await page.goto(`${store}/checkout`);
      await page.getByRole('button', { name: /^Place order/ }).click();
      await expect(page.getByRole('textbox', { name: 'Email' })).toBeFocused();
      await expectAccessible(page);
    });

    test(`passes axe empty, in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${store}/cart`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Your cart is empty' }),
      ).toBeVisible();
      await expectAccessible(page);
    });
  }
});
