import { readFile } from 'node:fs/promises';
import { FileBasedTemplateLoader, HandlebarsMjmlGenerator } from '@vendure/email-plugin';
import { beforeAll, describe, expect, it } from 'vitest';
import { paths } from '../vendure-config.js';
import { type ReceiptInput, receiptOf } from './receipt.js';

/** The receipt as the worker renders it: Deckle's template, through the plugin's own generator. */
async function render(input: ReceiptInput) {
  const template = await readFile(`${paths.emailTemplates}/order-confirmation/body.hbs`, 'utf8');
  return generator.generate(
    '"Deckle" <orders@deckle.invalid>',
    '{{ subject }}',
    template,
    receiptOf(input),
  );
}

const generator = new HandlebarsMjmlGenerator();

beforeAll(async () => {
  // The generator reads only the loader, for the partials.
  await generator.onInit({
    templateLoader: new FileBasedTemplateLoader(paths.emailTemplates),
  } as unknown as Parameters<HandlebarsMjmlGenerator['onInit']>[0]);
});

const order: ReceiptInput = {
  code: 'J3JTEWLYTBXV5QS3',
  placedAt: new Date('2026-10-08T15:07:34Z'),
  currency: 'USD',
  language: 'pt-BR',
  copyNumber: null,
  lines: [
    {
      title: 'Melencolia I',
      artist: 'Albrecht Dürer',
      date: '1514',
      paperSize: 'A3',
      quantity: 1,
      unitPrice: 9000,
      linePrice: 9000,
      editionSize: null,
      image: {
        url: 'http://localhost:8080/assets/preview/31/336228__preview.webp',
        width: 1901,
        height: 2400,
      },
    },
  ],
  subtotal: 9000,
  shipping: 1200,
  total: 10_200,
  address: {
    fullName: 'Ana Souza',
    streetLine1: 'Avenida Paulista, 1578',
    streetLine2: null,
    city: 'São Paulo',
    postalCode: '01310-200',
    countryCode: 'BR',
    country: 'Brazil',
  },
};

describe("the receipt's template", () => {
  it('writes the order in its language, in the brand, with none of the stock template left', async () => {
    const { subject, body } = await render(order);
    expect(subject).toBe('Seu recibo do pedido J3JTEWLYTBXV5QS3');
    expect(body).toContain('<html lang="pt-BR"');
    for (const words of [
      'Pedido feito',
      'Obrigado, Ana',
      'Melencolia I',
      'Albrecht Dürer, 1514',
      'Frete, enrolada em tubo',
      'Avenida Paulista, 1578, São Paulo 01310-200, Brasil',
      'Nada é enviado',
      'DECKLE',
      // Handlebars escapes the address's = and &, which the mail app reads back as written.
      '336228__preview.webp?preset&#x3D;thumb&amp;format&#x3D;jpg',
    ]) {
      expect(body).toContain(words);
    }
    expect(body).not.toMatch(/company header|footer text|Dear /);
  });

  it('follows the reader’s dark theme where the mail app does', async () => {
    const { body } = await render({ ...order, language: 'en' });
    expect(body).toContain('@media (prefers-color-scheme: dark)');
    expect(body).toContain('#17130f');
    expect(body).toContain('Thank you, Ana');
  });

  it('leaves out the address and the picture an order lacks', async () => {
    const { body } = await render({
      ...order,
      address: null,
      lines: order.lines.map((line) => ({ ...line, artist: null, date: null, image: null })),
    });
    expect(body).not.toContain('Entrega para');
    expect(body).not.toContain('<img');
    expect(body).toContain('>Obrigado<');
  });
});
