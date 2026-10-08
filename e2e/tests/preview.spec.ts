import { expect, type Page, test } from '@playwright/test';
import { expectAccessible } from '../support/accessibility.js';
import { cms, EDITOR_STATE } from '../support/cms.js';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';
// compose.yaml's own: the store names it to the gateway, from inside the network.
const gatewayPreviewSecret =
  process.env['GATEWAY_PREVIEW_SECRET'] ?? 'local-only-gateway-preview-secret-not-for-production';

/** Opens the story of a work in the CMS, as an editor would. */
async function openStory(page: Page, work: string): Promise<void> {
  await page.goto(`${cms}/admin/collections/stories`);
  await page.getByRole('textbox', { name: 'Buscar por Slug da obra' }).fill(work);
  // The list puts the search in its address a moment later, which would undo an earlier click.
  await expect(page).toHaveURL(new RegExp(`[?&]search=${work}`));
  await page.getByRole('link', { name: work, exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Título/ })).toBeVisible();
}

/** A title no run has used, so what shows can only be this run's draft. */
const draftTitle = (about: string) => `${about}, a draft of ${String(Date.now())}`;

test.describe('a draft in preview', () => {
  // Payload picks the admin's language from the browser's.
  test.use({ locale: 'pt-BR', storageState: EDITOR_STATE });

  test("opens from the CMS behind a trial proof, and leaves it for what's published", async ({
    page,
    context,
    request,
  }) => {
    await openStory(page, 'the-rhinoceros');
    const draft = draftTitle('About the woodcut');
    // Every keystroke is kept as a draft, never published.
    const kept = page.waitForResponse(
      (response) =>
        /\/api\/stories\/\d+\?autosave=true/.test(response.url()) &&
        response.request().method() === 'PATCH' &&
        response.ok(),
    );
    await page.getByRole('textbox', { name: /^Título/ }).fill(draft);
    await kept;

    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Pré-visualização', exact: true }).click(),
    ]);
    await expect(tab).toHaveURL(`${store}/prints/the-rhinoceros#story`);
    await expect(tab.getByRole('heading', { level: 2, name: draft })).toBeVisible();
    const proof = tab.getByRole('complementary', { name: 'Trial proof' });
    await expect(proof).toBeVisible();
    await expectAccessible(tab);

    // A browser that names the store's secret still reads what is published:
    // Caddy drops the header before the gateway sees it.
    const asked = await request.post(`${store}/graphql`, {
      headers: { 'Deckle-Preview': gatewayPreviewSecret },
      data: { query: '{ artwork(slug: "the-rhinoceros") { story { title } } }' },
    });
    expect(await asked.json()).toEqual({
      data: { artwork: { story: { title: 'About the woodcut' } } },
    });

    await proof.getByRole('link', { name: 'See the published page' }).click();
    await expect(tab.getByRole('heading', { level: 2, name: 'About the woodcut' })).toBeVisible();
    await expect(proof).toHaveCount(0);
    await expect(tab).toHaveURL(`${store}/prints/the-rhinoceros#story`);
  });

  test("follows what the editor types, in the CMS's live preview", async ({ page, browser }) => {
    await openStory(page, 'knight-death-and-the-devil');
    // The admin remembers whether the live preview was left open.
    const toggle = page.getByRole('button', {
      name: /^(Pré-visualização|Sair da Visualização ao Vivo)$/,
    });
    await expect(toggle).toBeVisible();
    if ((await toggle.getAttribute('title')) === 'Pré-visualização') {
      await toggle.click();
    }
    const frame = page.frameLocator('iframe');
    await expect(frame.getByRole('complementary', { name: 'Trial proof' })).toBeVisible();

    const draft = draftTitle('About the engraving');
    await page.getByRole('textbox', { name: /^Título/ }).fill(draft);
    await expect(frame.getByRole('heading', { level: 2, name: draft })).toBeVisible();

    // Anyone else still reads what is published.
    const visitor = await browser.newPage();
    await visitor.goto(`${store}/prints/knight-death-and-the-devil`);
    await expect(
      visitor.getByRole('heading', { level: 2, name: 'About the engraving' }),
    ).toBeVisible();
    await expect(visitor.getByRole('complementary', { name: 'Trial proof' })).toHaveCount(0);
    await visitor.close();
  });
});
