import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { expectAccessible } from '../support/accessibility.js';
import { receiptFor } from '../support/mailpit.js';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';
const MELENCOLIA = '/drops/melencolia-i-numbered';

/**
 * A browser with a passkey device of its own: Playwright's virtual
 * authenticator answers the page's WebAuthn ceremonies, as a phone would.
 */
async function withDevice(context: BrowserContext): Promise<void> {
  await context.credentials.install();
}

/** Claims a copy of Melencolia I, making a passkey on the way in. */
async function claimWithNewPasskey(page: Page): Promise<number> {
  await page.goto(`${store}${MELENCOLIA}`);
  await page.getByRole('button', { name: 'Claim a copy' }).click();
  const dialog = page.getByRole('dialog', { name: 'Claim with a passkey' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Make a passkey' }).click();
  const heading = page.getByRole('heading', { level: 1, name: /^Copy \d+ of 50 is yours/ });
  await expect(heading).toBeVisible();
  return Number(/Copy (\d+)/.exec((await heading.textContent()) ?? '')?.[1]);
}

test.describe('the drops', () => {
  test('lists the drop that is open, and the one still to open', async ({ page }) => {
    await page.goto(`${store}/drops`);
    await expect(page.getByRole('heading', { level: 1, name: 'Drops' })).toBeVisible();
    const open = page.getByRole('region', { name: 'Melencolia I, in fifty numbered copies' });
    await expect(open).toContainText('Open now');
    await expect(open.getByRole('link', { name: 'Claim a copy' })).toHaveAttribute(
      'href',
      MELENCOLIA,
    );
    const next = page.getByRole('region', { name: 'The Great Wave, in fifty numbered copies' });
    await expect(next).toContainText(/Opens \w{3} \d{1,2} \w{3}/);
    await expect(next.getByRole('link', { name: 'See the drop' })).toBeVisible();
  });

  test('says what is open above every other page, and leads to it', async ({ page }) => {
    await page.goto(`${store}/prints`);
    await page.getByRole('link', { name: 'Claim a copy' }).first().click();
    await expect(page).toHaveURL(`${store}${MELENCOLIA}`);
    await expect(page.getByRole('link', { name: 'Claim a copy' })).toHaveCount(0);
  });

  test('points from the print to its numbered edition', async ({ page }) => {
    await page.goto(`${store}/prints/melencolia-i`);
    await expect(page.getByRole('link', { name: /A numbered edition of 50/ })).toBeVisible();
    const band = page.getByRole('region', { name: 'Melencolia I, in fifty numbered copies' });
    await expect(band.getByRole('list', { name: /^Copies 1 to 50/ })).toBeVisible();
  });
});

test.describe('a copy of a drop', () => {
  test.beforeEach(async ({ context }) => {
    await withDevice(context);
  });

  test('is claimed with a new passkey, held for ten minutes, and paid for', async ({ page }) => {
    const number = await claimWithNewPasskey(page);
    await expect(page.getByRole('timer', { name: /left to pay$/ })).toBeVisible();
    // The grid marks it as the reader's own.
    await expect(page.getByText(`${String(number)}, yours`)).toBeAttached();
    await expect(page.getByRole('link', { name: 'Your account' })).toBeVisible();

    await page.getByRole('link', { name: 'Pay $180' }).click();
    await expect(page).toHaveURL(`${store}/checkout?drop=melencolia-i-numbered`);
    const summary = page.getByRole('complementary', { name: 'Your order' });
    await expect(summary).toContainText(`Copy ${String(number)} of 50`);
    await expect(summary).toContainText('Included');
    await expect(summary).toContainText(/Held for you · \d+:\d{2} left/);

    const email = `collector.${String(Date.now())}@example.com`;
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Full name' }).fill('Ana Souza');
    await page.getByRole('textbox', { name: 'Address', exact: true }).fill('1000 Fifth Avenue');
    await page.getByRole('textbox', { name: 'City' }).fill('New York');
    await page.getByRole('textbox', { name: 'Postcode' }).fill('10028');
    await page.getByRole('button', { name: 'Place order · $180' }).click();

    await expect(page).toHaveURL(/\/orders\/[A-Z0-9]+$/);
    await expect(
      page.getByRole('heading', { level: 2, name: `Melencolia I, copy ${String(number)} of 50` }),
    ).toBeVisible();
    const code = page.url().split('/').at(-1) ?? '';
    expect(await receiptFor(email)).toContain(code);

    await page.goto(`${store}/account`);
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
    await expect(page.getByText('Paid')).toBeVisible();
    await expect(page.getByRole('link', { name: `Order ${code}` })).toBeVisible();

    await page.goto(`${store}${MELENCOLIA}`);
    await expect(
      page.getByRole('heading', { level: 1, name: `Copy ${String(number)} of 50 is yours` }),
    ).toBeVisible();
  });

  test('can be let go, and is open again for the next person', async ({ page }) => {
    await claimWithNewPasskey(page);
    await page.getByRole('button', { name: 'Let it go' }).click();
    await expect(page.getByRole('button', { name: 'Claim a copy' })).toBeEnabled();
  });

  test('changes in the grid another browser is watching, as it happens', async ({
    page,
    browser,
  }) => {
    const watcher = await browser.newContext();
    const watching = await watcher.newPage();
    await watching.goto(`${store}${MELENCOLIA}`);
    await expect(watching.getByText('Updates as they are claimed')).toBeVisible();

    const number = await claimWithNewPasskey(page);
    // Other browsers claim at the same time, so the copy is followed by its number.
    const square = watching
      .getByRole('list', { name: /^Copies 1 to 50/ })
      .getByRole('listitem')
      .nth(number - 1);
    await expect(square).toContainText('held while someone pays', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Let it go' }).click();
    await expect(square).toContainText(`${String(number)}, open`, { timeout: 10_000 });
    await watcher.close();
  });

  test('signs in again with the same passkey after signing out', async ({ page }) => {
    await page.goto(`${store}/account`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in with a passkey' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Make a passkey' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
    await expect(page.getByText('No copies yet.', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in with a passkey' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Use my passkey' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();
  });
});

test.describe('the drop pages', () => {
  const pages = [
    ['the drops', '/drops', 'Drops'],
    ['a drop', MELENCOLIA, 'Melencolia I, in fifty numbered copies'],
    ['how drops work', '/about/drops', 'How drops work'],
    ['the way in', '/account', 'Sign in with a passkey'],
  ] as const;

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

  for (const scheme of ['light', 'dark'] as const) {
    test(`a held copy and the passkey dialog pass axe in the ${scheme} theme`, async ({
      page,
      context,
    }) => {
      await withDevice(context);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${store}${MELENCOLIA}`);
      await page.getByRole('button', { name: 'Claim a copy' }).click();
      await expect(page.getByRole('dialog', { name: 'Claim with a passkey' })).toBeVisible();
      await expectAccessible(page);

      await page.getByRole('button', { name: 'Make a passkey' }).click();
      await expect(page.getByRole('timer', { name: /left to pay$/ })).toBeVisible();
      await expectAccessible(page);
      await page.getByRole('button', { name: 'Let it go' }).click();
    });
  }
});
