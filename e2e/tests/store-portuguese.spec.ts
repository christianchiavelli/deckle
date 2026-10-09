import { expect, test } from '@playwright/test';
import { expectAccessible } from '../support/accessibility.js';

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';

/** Every page of the Portuguese edition this file checks, each audited by axe in both themes. */
const pages = [
  ['the front page', '/pt-br', 'Gravuras do Met, nos tamanhos que suas digitalizações aguentam'],
  ['the prints', '/pt-br/prints', 'As gravuras'],
  ['a print', '/pt-br/prints/melencolia-i', 'Melencolia I'],
  ['the collections', '/pt-br/collections', 'Coleções'],
  ['a collection', '/pt-br/collections/durer-in-copper-and-wood', 'Dürer no cobre e na madeira'],
  ['the stories', '/pt-br/journal', 'Histórias'],
  ['the drops', '/pt-br/drops', 'Drops'],
  [
    'a drop',
    '/pt-br/drops/melencolia-i-numbered',
    'Melencolia I, em cinquenta exemplares numerados',
  ],
  ['how drops work', '/pt-br/about/drops', 'Como funcionam os drops'],
  ['how prints are sized', '/pt-br/about/sizes', 'Como definimos os tamanhos'],
  ['a search', '/pt-br/search?q=durer', 'Gravuras para “durer”'],
  ['the cart', '/pt-br/cart', 'Seu carrinho está vazio'],
  ['the way in', '/pt-br/account', 'Entrar com chave de acesso'],
  ['a missing page', '/pt-br/no-such-page', 'Esta página não está aqui'],
] as const;

test.describe('the Portuguese edition', () => {
  for (const [name, path, heading] of pages) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${name} speaks Portuguese and passes axe in the ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`${store}${path}`);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
        await expectAccessible(page);
      });
    }
  }

  test('names each page in both editions, and keeps English at the root', async ({ request }) => {
    const portuguese = await request.get(`${store}/pt-br/prints?technique=etchings`);
    expect(portuguese.status()).toBe(200);
    // Next adds links of its own to the same header.
    const link = portuguese.headers()['link'] ?? '';
    for (const alternate of [
      `<${store}/prints>; rel="alternate"; hreflang="en"`,
      `<${store}/pt-br/prints>; rel="alternate"; hreflang="pt-BR"`,
      `<${store}/prints>; rel="alternate"; hreflang="x-default"`,
    ]) {
      expect(link).toContain(alternate);
    }

    // The English edition has one address, the one without a prefix.
    const english = await request.get(`${store}/en/prints?technique=etchings`, { maxRedirects: 0 });
    expect(english.status()).toBe(308);
    expect(english.headers()['location']).toBe('/prints?technique=etchings');
  });

  test('answers an address no page has with a 404, in Portuguese', async ({ page }) => {
    const response = await page.goto(`${store}/pt-br/no-such-page`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'Ver as gravuras' })).toHaveAttribute(
      'href',
      '/pt-br/prints',
    );
  });

  test('links within the edition, to pages that answer', async ({ page, request }) => {
    const hrefs = new Set<string>();
    for (const path of [
      ...pages.map(([, path]) => path),
      '/pt-br/prints?technique=etchings',
      '/pt-br/drops/the-great-wave-numbered',
    ]) {
      await page.goto(`${store}${path}`);
      // The language switch is the one way out of the edition.
      const found = await page
        .locator('a[href^="/"]:not(nav[aria-label="Idioma"] a)')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      for (const href of found) {
        hrefs.add(href.replace(/#.*$/, ''));
      }
    }
    expect([...hrefs].filter((href) => href !== '/pt-br' && !href.startsWith('/pt-br/'))).toEqual(
      [],
    );
    const broken: string[] = [];
    for (const href of hrefs) {
      const response = await request.get(`${store}${href}`);
      if (!response.ok()) {
        broken.push(`${href} answers ${String(response.status())}`);
      }
    }
    expect(hrefs.size).toBeGreaterThan(50);
    expect(broken).toEqual([]);
  });

  test('switches to the same page in English, and back', async ({ page }) => {
    await page.goto(`${store}/pt-br/prints/melencolia-i`);
    const portuguese = page.getByRole('banner').getByRole('navigation', { name: 'Idioma' });
    await expect(portuguese.getByRole('link', { name: 'PT Português' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await portuguese.getByRole('link', { name: 'EN English' }).click();
    await expect(page).toHaveURL(`${store}/prints/melencolia-i`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const english = page.getByRole('banner').getByRole('navigation', { name: 'Language' });
    await english.getByRole('link', { name: 'PT Português' }).click();
    await expect(page).toHaveURL(`${store}/pt-br/prints/melencolia-i`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });

  test('finds the page in the other edition from where the browser came, with no script', async ({
    request,
  }) => {
    // What the switch asks while a work's page has yet to learn its own address.
    const switched = (to: string, referer: string) =>
      request.get(`${store}/api/edition?to=${to}`, {
        headers: { Referer: referer },
        maxRedirects: 0,
      });
    const portuguese = await switched('pt-br', `${store}/prints?technique=etchings`);
    expect(portuguese.status()).toBe(307);
    expect(portuguese.headers()['location']).toBe('/pt-br/prints?technique=etchings');
    const english = await switched('en', `${store}/pt-br/prints/melencolia-i`);
    expect(english.headers()['location']).toBe('/prints/melencolia-i');
    const elsewhere = await switched('pt-br', 'https://elsewhere.example/prints');
    expect(elsewhere.headers()['location']).toBe('/pt-br');
  });

  test('carries a search over to the other edition, from the phone’s menu too', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${store}/pt-br/search?q=durer`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Gravuras para “durer”' }),
    ).toBeVisible();
    // The query is the browser's to add, once the header has hydrated: open and follow until it does.
    await expect(async () => {
      await page.goto(`${store}/pt-br/search?q=durer`);
      await page.getByRole('button', { name: 'Menu' }).click();
      await page
        .getByRole('navigation', { name: 'Idioma' })
        .getByRole('link', { name: 'EN English' })
        .click();
      await expect(page).toHaveURL(`${store}/search?q=durer`, { timeout: 2000 });
    }).toPass();
    await expect(page.getByRole('heading', { level: 1, name: 'Prints for “durer”' })).toBeVisible();
  });

  test('reads the CMS’s words in Portuguese, through the gateway', async ({ page, request }) => {
    await page.goto(`${store}/pt-br/collections`);
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'Chuva, neve e fogos',
      'Dürer no cobre e na madeira',
      'Monstros e sonhos',
      'Trinta e seis vistas do monte Fuji',
    ]);
    await page.goto(`${store}/pt-br/prints/the-rhinoceros`);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Sobre a xilogravura' }),
    ).toBeVisible();
    // The museum's record stays in the museum's words, marked as English.
    const record = page.getByRole('region', { name: 'Do registro do museu' });
    await expect(record.getByText('Woodcut', { exact: true })).toHaveAttribute('lang', 'en');

    // The detail beside a story, described and captioned in Portuguese too. Not the
    // rhinoceros's: where these checks ran before the detail had words, the preview's left
    // a draft of it, and the seed writes over no draft.
    await page.goto(`${store}/pt-br/prints/melencolia-i`);
    await expect(
      page
        .getByRole('figure', { name: /^O quadrado mágico: cada linha, coluna e diagonal soma 34/ })
        .getByRole('img', { name: /^O quadrado mágico na parede/ }),
    ).toBeAttached();

    // The browser's own setting chooses the language for anyone asking the gateway directly.
    const ask = (headers: Record<string, string>) =>
      request
        .post(`${store}/graphql`, {
          headers,
          data: { query: '{ curation(slug: "durer-in-copper-and-wood") { title } }' },
        })
        .then((response) => response.json());
    expect(await ask({ 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' })).toEqual({
      data: { curation: { title: 'Dürer no cobre e na madeira' } },
    });
    expect(await ask({ 'Accept-Language': 'fr-FR,en;q=0.5' })).toEqual({
      data: { curation: { title: 'Dürer in copper and wood' } },
    });
  });

  test('lists the prints in the edition’s words, and narrows them by an address both share', async ({
    page,
  }) => {
    await page.goto(`${store}/pt-br/prints`);
    await expect(page.getByText('48 gravuras, da mais antiga à mais nova')).toBeVisible();
    const prints = page.getByRole('region', { name: 'As gravuras' });
    await expect(prints.getByText(/^A partir de US\$\s55$/).first()).toBeVisible();

    const filters = page.getByRole('navigation', { name: 'Filtrar as gravuras' });
    await filters.getByRole('link', { name: /^Águas-fortes 8 gravuras$/ }).click();
    await expect(page).toHaveURL(/\/pt-br\/prints\?technique=etchings$/);
    await expect(page.getByText('8 gravuras de 48, da mais antiga à mais nova')).toBeVisible();

    // Centuries in Roman numerals, as Portuguese writes them.
    await filters.getByRole('link', { name: /^XVIII 4 gravuras$/ }).click();
    await expect(page).toHaveURL(/technique=etchings&century=18th-century/);
    await expect(page.getByText('4 gravuras de 48, da mais antiga à mais nova')).toBeVisible();
  });

  test('finds a technique by its Portuguese name, and suggests it as one types', async ({
    page,
  }) => {
    await page.goto(`${store}/pt-br/search?q=litografias`);
    await expect(page.getByText('5 gravuras', { exact: true })).toBeVisible();

    const field = page.getByRole('banner').getByRole('combobox', { name: 'Buscar' });
    const technique = page.getByRole('option', { name: 'Litografias 5 gravuras' });
    // Typed before the header hydrates, a search suggests nothing: type again until it does.
    await expect(async () => {
      await field.fill('');
      await field.pressSequentially('litog');
      await expect(technique).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(technique).toHaveAttribute('href', '/pt-br/prints?technique=lithographs');
  });

  test('sells a print in Portuguese, from its page to the order', async ({ page }) => {
    await page.goto(`${store}/pt-br/prints/melencolia-i`);
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    const sheet = page.getByRole('region', { name: 'Adicionada ao carrinho' });
    await expect(sheet).toContainText(/A3, sem moldura · US\$\s90/);
    await sheet.getByRole('link', { name: 'Finalizar compra' }).click();

    await expect(page).toHaveURL(/\/pt-br\/checkout$/);
    // Commerce names its countries in English; the edition names them by their code.
    const country = page.getByRole('combobox', { name: 'País' });
    await expect(country.locator('option:checked')).toHaveText('Estados Unidos');
    await page.getByRole('textbox', { name: 'E-mail' }).fill('ana@example.com');
    await page.getByRole('textbox', { name: 'Nome completo' }).fill('Ana Souza');
    await page
      .getByRole('textbox', { name: 'Endereço', exact: true })
      .fill('Avenida Paulista, 1578');
    await page.getByRole('textbox', { name: 'Cidade' }).fill('São Paulo');
    await page.getByRole('textbox', { name: 'CEP' }).fill('01310-200');
    await country.selectOption({ label: 'Brasil' });
    await page.getByRole('button', { name: /^Fazer o pedido/ }).click();

    await expect(page).toHaveURL(/\/pt-br\/orders\/[A-Z0-9]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Obrigado, Ana' })).toBeVisible();
    await expect(
      page.getByText('Ana Souza, Avenida Paulista, 1578, São Paulo 01310-200, Brasil'),
    ).toBeVisible();
  });
});
