import { expect, test } from '@playwright/test';

import { measure, settle, tap, typeInto, type Visit } from './measure.ts';
import {
  ATTACHMENT,
  explain,
  format,
  limitOf,
  type Measurement,
  METRICS,
  readBaseline,
  summarise,
} from './report.ts';

/**
 * Each page visited five times, the way a reader uses it on a phone: loaded
 * cold, read to the end, then put to work. The median of each metric is held
 * against the baseline, and a page that has none yet is measured, not judged.
 * The stack is the images this commit published, which carry their data: the
 * catalogue baked in, the CMS's seed, and a demo trade drawn from a fixed seed.
 */
const VISITS = 5;

const PAGES: readonly Visit[] = [
  {
    key: 'front',
    name: 'The front page',
    path: '/',
    journey: async (page) => {
      // The menu, then the collections from it.
      await tap(page.getByRole('button', { name: 'Menu' }));
      await tap(
        page
          .getByRole('navigation', { name: 'Shop' })
          .getByRole('link', { name: 'Collections' })
          .filter({ visible: true })
          .first(),
      );
      await expect(page).toHaveURL(/\/collections$/);
    },
  },
  {
    key: 'prints',
    name: 'The prints',
    path: '/prints',
    journey: async (page) => {
      // Narrowed to the etchings, which reloads the list and every filter's count.
      await tap(
        page
          .getByRole('navigation', { name: 'Filter the prints' })
          .getByRole('link', { name: /^Etchings/ }),
      );
      await expect(page).toHaveURL(/\/prints\?technique=etchings$/);
    },
  },
  {
    key: 'print',
    name: 'A print',
    path: '/prints/melencolia-i',
    journey: async (page) => {
      // A smaller size, its tile tapped as a thumb would, then into the cart.
      await tap(page.locator('label').filter({ has: page.getByRole('radio', { name: /^A4/ }) }));
      await tap(page.getByRole('button', { name: 'Add to cart' }));
      await expect(page.getByRole('region', { name: 'Added to your cart' })).toBeVisible();
    },
  },
  {
    key: 'search',
    name: 'The search',
    path: '/search',
    journey: async (page) => {
      // A maker typed a key at a time: the suggestions follow each key.
      await typeInto(page.getByRole('combobox', { name: 'Search' }), 'dur');
      await expect(page.getByRole('option', { name: /^Albrecht Dürer/ })).toBeVisible();
      await settle(page);
    },
  },
];

const baseline = readBaseline();
// The baseline is the CI runners' own: another machine's numbers are set against it, not judged by it.
const judged = Boolean(process.env['CI']);

for (const { journey, ...page } of PAGES) {
  test(`${page.name}, ${page.path}`, async ({ browser, baseURL }, testInfo) => {
    const visits: Measurement[] = [];
    for (let visit = 1; visit <= VISITS; visit++) {
      visits.push(
        await test.step(`visit ${String(visit)} of ${String(VISITS)}`, () =>
          measure(browser, baseURL ?? '', { ...page, journey })),
      );
    }

    const result = summarise(page, visits);
    await testInfo.attach(ATTACHMENT, {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });

    const base = baseline.pages[page.key];
    if (!base || !judged) {
      testInfo.annotations.push({
        type: 'notice',
        description: base
          ? 'Measured off CI: compared, not judged'
          : 'No baseline yet: measured, not judged',
      });
      return;
    }
    for (const metric of METRICS) {
      const value = result.median[metric];
      const typical = visits.find((visit) => visit[metric].value === value)?.[metric];
      const about = typical ? `, ${explain(metric, typical)}` : '';
      expect
        .soft(
          value,
          `${metric} ${format(metric, value)} against a baseline of ${format(metric, base[metric])}${about}`,
        )
        .toBeLessThanOrEqual(limitOf(metric, base[metric]));
    }
  });
}
