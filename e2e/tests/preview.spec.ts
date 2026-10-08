import { expect, type Page, test } from '@playwright/test';
import { expectAccessible } from '../support/accessibility.js';
import { cms, EDITOR_STATE } from '../support/cms.js';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';
// compose.yaml's own: the store names it to the gateway, from inside the network.
const gatewayPreviewSecret =
  process.env['GATEWAY_PREVIEW_SECRET'] ?? 'local-only-gateway-preview-secret-not-for-production';

/**
 * Opens the story of a work in the CMS, as an editor would, in one of its
 * languages. The admin remembers the editor's last language, and every test
 * signs in as the same editor, so each names its own.
 */
async function openStory(page: Page, work: string, locale: 'en' | 'pt' = 'en'): Promise<void> {
  await page.goto(`${cms}/admin/collections/stories?locale=${locale}`);
  await page.getByRole('textbox', { name: 'Buscar por Slug da obra' }).fill(work);
  // The list puts the search in its address a moment later, which would undo an earlier click.
  await expect(page).toHaveURL(new RegExp(`[?&]search=${work}`));
  await page.getByRole('link', { name: work, exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Título/ })).toBeVisible();
  const document = new URL(page.url());
  if (document.searchParams.get('locale') !== locale) {
    document.searchParams.set('locale', locale);
    await page.goto(document.toString());
    await expect(page.getByRole('textbox', { name: /^Título/ })).toBeVisible();
  }
}

/** A title no run has used, so what shows can only be this run's draft. */
const draftTitle = (about: string) => `${about}, a draft of ${String(Date.now())}`;

test.describe('a draft in preview', () => {
  // Payload picks the admin's language from the browser's.
  test.use({ locale: 'pt-BR', storageState: EDITOR_STATE });
  // The admin keeps the editor's last language for the next page it opens, and
  // every test here is the same editor: one at a time, or one test's language
  // leaks into another's preview link.
  test.describe.configure({ mode: 'default' });

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

  test('opens a draft written in Portuguese in the Portuguese edition', async ({
    page,
    context,
  }) => {
    await openStory(page, 'south-wind-clear-sky', 'pt');
    const title = page.getByRole('textbox', { name: /^Título/ });
    // The Portuguese title, or an earlier run's draft of it.
    await expect(title).toHaveValue(/^Sobre a gravura/);

    const draft = draftTitle('Sobre a gravura');
    const kept = page.waitForResponse(
      (response) =>
        /\/api\/stories\/\d+\?/.test(response.url()) &&
        new URL(response.url()).searchParams.get('autosave') === 'true' &&
        new URL(response.url()).searchParams.get('locale') === 'pt' &&
        response.request().method() === 'PATCH' &&
        response.ok(),
    );
    await title.fill(draft);
    await kept;

    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Pré-visualização', exact: true }).click(),
    ]);
    await expect(tab).toHaveURL(`${store}/pt-br/prints/south-wind-clear-sky#story`);
    await expect(tab.getByRole('heading', { level: 2, name: draft })).toBeVisible();
    const proof = tab.getByRole('complementary', { name: 'Prova de estado' });
    await expect(proof).toBeVisible();

    await proof.getByRole('link', { name: 'Ver a página publicada' }).click();
    await expect(
      tab.getByRole('heading', { level: 2, name: 'Sobre a gravura', exact: true }),
    ).toBeVisible();
    await expect(proof).toHaveCount(0);
    await expect(tab).toHaveURL(`${store}/pt-br/prints/south-wind-clear-sky#story`);

    // Back to English, which the admin keeps for whoever opens it next.
    await openStory(page, 'south-wind-clear-sky', 'en');
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
