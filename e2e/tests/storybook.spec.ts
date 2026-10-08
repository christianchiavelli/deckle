import { expect, test } from '@playwright/test';

const storybook = process.env['STORYBOOK_URL'] ?? 'http://localhost:8083';

test.describe('the Storybook the stack serves', () => {
  test('shows the design system, from its foundations to the screens', async ({ page }) => {
    await page.goto(storybook);
    const stories = page.getByRole('navigation', { name: 'Stories' });
    for (const group of ['Foundations', 'Components', 'Screens']) {
      await expect(stories.getByText(group, { exact: true })).toBeVisible();
    }
    // The manager opens on the introduction, drawn in the preview's frame.
    await expect(
      page.frameLocator('#storybook-preview-iframe').getByRole('heading', { level: 1 }).first(),
    ).toBeVisible();
  });

  test('draws a screen with the data set’s images and the brand’s typeface', async ({ page }) => {
    await page.goto(`${storybook}/iframe.html?id=screens-work-page--desktop&viewMode=story`);
    await expect(page.getByRole('heading', { level: 1, name: 'Melencolia I' })).toBeVisible();
    const scan = page.getByRole('figure', { name: /^The Met’s scan/ }).getByRole('img');
    await expect(scan).toBeVisible();
    // Served from the image's /met, as the store serves them from commerce.
    await expect
      .poll(() => scan.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth))
      .toBeGreaterThan(0);
    // The brand's own files, not a fallback: `fonts.check` passes for a family nobody declared.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.fonts].some(
            (face) =>
              face.family.replaceAll('"', '') === 'Host Grotesk' && face.status === 'loaded',
          ),
        ),
      )
      .toBe(true);
  });
});
