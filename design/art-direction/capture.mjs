// Captures every direction in both themes, first screen and whole page, then lays
// them side by side on comparison sheets: `pnpm --filter @deckle/art-direction capture`.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

/* global document -- evaluated callbacks run in the page */

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = `${here}shots`;
const directions = [
  ['plate-mark', 'A · Plate mark'],
  ['kento', 'B · Kento'],
  ['proof', 'C · Proof'],
];
const themes = ['light', 'dark'];

await mkdir(shots, { recursive: true });
const browser = await chromium.launch();

for (const [direction] of directions) {
  for (const theme of themes) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    await page.goto(`${pathToFileURL(`${here}artwork.html`).href}?d=${direction}&theme=${theme}`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${shots}/${direction}-${theme}.png` });
    await page.screenshot({ path: `${shots}/${direction}-${theme}-full.png`, fullPage: true });
    await page.close();
  }
}

/** A sheet is a page of captures laid out in HTML, so it needs no image library. */
async function sheet(name, columns, cells) {
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; padding: 36px; background: #e8e6e2; font: 600 30px/1.2 'Segoe UI', sans-serif; color: #181614; }
    .grid { display: grid; grid-template-columns: repeat(${columns}, 720px); gap: 28px; }
    figure { margin: 0; } figcaption { margin-block-end: 12px; }
    img { display: block; width: 720px; }
  </style><div class="grid">${cells
    .map(([label, file]) => `<figure><figcaption>${label}</figcaption><img src="${file}"></figure>`)
    .join('')}</div>`;
  // Served from a file beside the captures: a page set from a string may not load local images.
  const layout = `${shots}/${name}.html`;
  await writeFile(layout, html);
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await page.goto(pathToFileURL(layout).href, { waitUntil: 'load' });
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  await page.close();
  await rm(layout);
}

await sheet(
  'compare-first-screen',
  3,
  themes.flatMap((theme) =>
    directions.map(([d, label]) => [`${label}, ${theme}`, `${d}-${theme}.png`]),
  ),
);
for (const theme of themes) {
  await sheet(
    `compare-full-${theme}`,
    3,
    directions.map(([d, label]) => [`${label}, ${theme}`, `${d}-${theme}-full.png`]),
  );
}

// C, modernised: the same page rebuilt as a contemporary shop, first in two
// plain accents, then in three palettes that each tell a story from the trade.
const modern = [
  ['c2-ultramarine', 'C2 · ultramarine'],
  ['c2-magenta', 'C2 · magenta'],
];
const trade = [
  ['c2-vermilion', 'Ink and vermilion'],
  ['c2-gallery', 'Gallery wall'],
  ['c2-copper', 'Copper plate'],
];
for (const [direction] of [...modern, ...trade]) {
  for (const theme of themes) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    await page.goto(`${pathToFileURL(`${here}modern.html`).href}?d=${direction}&theme=${theme}`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${shots}/${direction}-${theme}.png` });
    await page.screenshot({ path: `${shots}/${direction}-${theme}-full.png`, fullPage: true });
    await page.close();
  }
}

const proofAndModern = [['proof', 'C · Proof'], ...modern];
await sheet(
  'compare-c-first-screen',
  3,
  themes.flatMap((theme) =>
    proofAndModern.map(([d, label]) => [`${label}, ${theme}`, `${d}-${theme}.png`]),
  ),
);
for (const theme of themes) {
  await sheet(
    `compare-c-full-${theme}`,
    3,
    proofAndModern.map(([d, label]) => [`${label}, ${theme}`, `${d}-${theme}-full.png`]),
  );
}

await sheet(
  'compare-trade-first-screen',
  3,
  themes.flatMap((theme) => trade.map(([d, label]) => [`${label}, ${theme}`, `${d}-${theme}.png`])),
);
for (const theme of themes) {
  await sheet(
    `compare-trade-full-${theme}`,
    3,
    trade.map(([d, label]) => [`${label}, ${theme}`, `${d}-${theme}-full.png`]),
  );
}

await browser.close();
const pages = (directions.length + modern.length + trade.length) * themes.length;
console.log(`captured ${pages} pages into ${shots}`);
