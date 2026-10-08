import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Locator,
  type Page,
} from '@playwright/test';

/*
 * The README's screens, taken from the stack `docker compose up --wait` started:
 * `pnpm run screenshots`, or `pnpm run screenshots <name>…` for some of them. Each
 * is the page as a visitor first sees it, at a laptop's width unless its name says
 * phone, and what it changes it puts back.
 */

const store = process.env['STORE_URL'] ?? 'http://localhost:8080';
const cms = process.env['CMS_URL'] ?? 'http://localhost:8081';
const dashboard = process.env['DASHBOARD_URL'] ?? 'http://localhost:8082';
const storybook = process.env['STORYBOOK_URL'] ?? 'http://localhost:8083';
const out = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));

const LAPTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

type Scheme = 'light' | 'dark';

/** Takes one screen and writes it as `<name>.png`. */
type Take = (browser: Browser, name: string) => Promise<void>;

/** A visitor of their own: a fresh context, in English, in one theme. */
async function visitor(
  browser: Browser,
  scheme: Scheme,
  viewport = LAPTOP,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport,
    colorScheme: scheme,
    locale: 'en-US',
    deviceScaleFactor: 1,
  });
  return { context, page: await context.newPage() };
}

/**
 * Until the page holds still: every placeholder filled, the fonts in, and each
 * image loaded, those further down too, which only load once scrolled to.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector('[aria-busy="true"]') === null);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const height = document.documentElement.scrollHeight;
    for (let top = 0; top < height; top += window.innerHeight) {
      window.scrollTo(0, top);
      await new Promise((settled) => setTimeout(settled, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.images]
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise((settled) => {
              image.addEventListener('load', settled);
              image.addEventListener('error', settled);
            }),
        ),
    );
  });
  await page.waitForTimeout(400);
}

async function shoot(target: Page | Locator, name: string): Promise<void> {
  await target.screenshot({ path: `${out}${name}.png` });
  process.stdout.write(`wrote docs/screenshots/${name}.png\n`);
}

/** A store page at the top, as it opens. */
function storePage(path: string, scheme: Scheme): Take {
  return async (browser, name) => {
    const { context, page } = await visitor(browser, scheme);
    await page.goto(`${store}${path}`);
    await settle(page);
    await shoot(page, name);
    await context.close();
  };
}

/** How large a print can be: the three scans the page explains the limit with. */
const sizes: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'light');
  await page.goto(`${store}/about/sizes`);
  await settle(page);
  await shoot(page.getByRole('region', { name: 'Three scans, three limits' }), name);
  await context.close();
};

/** A copy of the open drop, claimed with a passkey and held; then let go, so the edition loses none. */
const heldCopy: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'light');
  await context.credentials.install();
  await page.goto(`${store}/drops/melencolia-i-numbered`);
  await settle(page);
  await page.getByRole('button', { name: 'Claim a copy' }).click();
  await page.getByRole('dialog', { name: 'Claim with a passkey' }).waitFor();
  await page.getByRole('button', { name: 'Make a passkey' }).click();
  await page.getByRole('heading', { level: 1, name: /^Copy \d+ of 50 is yours/ }).waitFor();
  await settle(page);
  await shoot(page, name);
  await page.getByRole('button', { name: 'Let it go' }).click();
  await page.getByRole('button', { name: 'Claim a copy' }).waitFor();
  await context.close();
};

/** The open drop on a phone, its copies counted as they go. */
const dropOnAPhone: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'dark', PHONE);
  await page.goto(`${store}/drops/melencolia-i-numbered`);
  await settle(page);
  await shoot(page, name);
  await context.close();
};

/** A work in Portuguese, at its story: the CMS's words translated, the museum's record as the museum wrote it. */
const portuguese: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'light');
  await page.goto(`${store}/pt-br/prints/melencolia-i`);
  await settle(page);
  await page.locator('#story').evaluate((story) => {
    const header = document.querySelector('header');
    window.scrollTo(
      0,
      story.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight ?? 0),
    );
  });
  await page.waitForTimeout(400);
  await shoot(page, name);
  await context.close();
};

/** A story in the CMS, its live preview open beside it: the store's page behind a trial proof. */
const livePreview: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'light');
  const signedIn = await context.request.post(`${cms}/api/users/login`, {
    data: {
      email: process.env['CMS_ADMIN_EMAIL'] ?? 'editor@deckle.localhost',
      password: process.env['CMS_ADMIN_PASSWORD'] ?? 'deckle-editor',
    },
  });
  if (!signedIn.ok()) {
    throw new Error(`The CMS turned the editor away: ${String(signedIn.status())}`);
  }
  const found = await context.request.get(
    `${cms}/api/stories?where[artworkSlug][equals]=melencolia-i&depth=0&limit=1`,
  );
  const { docs } = (await found.json()) as { docs: { id: number }[] };
  const [story] = docs;
  if (story === undefined) {
    throw new Error('No story of Melencolia I in the CMS');
  }
  await page.goto(`${cms}/admin/collections/stories/${String(story.id)}?locale=en`);
  // The admin remembers whether the live preview was left open.
  const toggle = page.getByRole('button', { name: /^(Live Preview|Exit Live Preview)$/ });
  await toggle.waitFor();
  if ((await toggle.getAttribute('aria-label')) === 'Live Preview') {
    await toggle.click();
  }
  await page.frameLocator('iframe').getByRole('complementary', { name: 'Trial proof' }).waitFor();
  await page.waitForTimeout(1500);
  // From the top the preview runs past the fold, its trial proof with it; scrolled
  // just far enough, it pins under the toolbar whole.
  await page.locator('iframe').evaluate((frame) => {
    window.scrollTo(0, 0);
    const below = frame.getBoundingClientRect().bottom - window.innerHeight;
    window.scrollTo(0, Math.max(0, Math.ceil(below) + 4));
  });
  await page.waitForTimeout(400);
  await shoot(page, name);
  await context.close();
};

/**
 * Vendure's dashboard in Deckle's colours, over two months of invented trade, in
 * English. The dashboard keeps each user's settings on the server and prefers them
 * to the browser's, so the superadmin's own are set aside for the shot and put back.
 */
const commerce: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'light');
  const ask = async (query: string, variables: Record<string, unknown>) => {
    const response = await context.request.post(`${dashboard}/admin-api`, {
      data: { query, variables },
    });
    const { data, errors } = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: { message: string }[];
    };
    if (data === undefined || errors !== undefined) {
      throw new Error(`The Admin API refused: ${JSON.stringify(errors)}`);
    }
    return data;
  };
  const { login } = (await ask(
    'mutation SignIn($username: String!, $password: String!) { login(username: $username, password: $password) { __typename } }',
    {
      username: process.env['COMMERCE_SUPERADMIN_USERNAME'] ?? 'superadmin',
      password: process.env['COMMERCE_SUPERADMIN_PASSWORD'] ?? 'deckle-superadmin',
    },
  )) as { login: { __typename: string } };
  if (login.__typename !== 'CurrentUser') {
    throw new Error(`Commerce turned the superadmin away: ${login.__typename}`);
  }
  const key = 'vendure.dashboard.userSettings';
  const keep = (value: object) =>
    ask(
      'mutation Keep($input: SettingsStoreInput!) { setSettingsStoreValue(input: $input) { result } }',
      { input: { key, value } },
    );
  const { getSettingsStoreValue: chosen } = (await ask(
    'query Settings($key: String!) { getSettingsStoreValue(key: $key) }',
    { key },
  )) as { getSettingsStoreValue: object | null };
  if (chosen !== null) {
    await keep({ ...chosen, displayLanguage: 'en' });
  }
  try {
    await page.goto(`${dashboard}/dashboard`);
    // This month takes in whatever the e2e bought; last month is the demo trade's alone.
    await page.getByRole('button', { name: /^\w{3} \d{1,2}, \d{4} - / }).click();
    await page.getByRole('button', { name: 'Last month', exact: true }).click();
    // The preset closes over the chart, which would answer the pointer with a tooltip.
    await page.mouse.move(720, 32);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await shoot(page, name);
    // Closed first, so it saves nothing over what goes back.
    await page.close();
  } finally {
    if (chosen !== null) {
      await keep(chosen);
    }
    await context.close();
  }
};

/** The Storybook the stack serves, open on the design system's colours. */
const designSystem: Take = async (browser, name) => {
  const { context, page } = await visitor(browser, 'light');
  await page.goto(`${storybook}/?path=/docs/foundations-colour--docs`);
  await page
    .frameLocator('#storybook-preview-iframe')
    .getByRole('heading', { level: 1 })
    .first()
    .waitFor();
  await page.waitForTimeout(1500);
  await shoot(page, name);
  await context.close();
};

/** Every screen, by the name of its file. */
const screens: Record<string, Take> = {
  'work-light': storePage('/prints/melencolia-i', 'light'),
  'home-dark': storePage('/', 'dark'),
  'prints-dark': storePage('/prints?technique=etchings&century=18th-century', 'dark'),
  'sizes-light': sizes,
  'drop-held-light': heldCopy,
  'drop-phone-dark': dropOnAPhone,
  'work-pt-light': portuguese,
  'live-preview-light': livePreview,
  'dashboard-light': commerce,
  'storybook-light': designSystem,
};

const asked = process.argv.slice(2);
const unknown = asked.filter((name) => !(name in screens));
if (unknown.length > 0) {
  throw new Error(
    `No screen named ${unknown.join(', ')}. The screens: ${Object.keys(screens).join(', ')}`,
  );
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, take] of Object.entries(screens)) {
    if (asked.length === 0 || asked.includes(name)) {
      await take(browser, name);
    }
  }
} finally {
  await browser.close();
}
