import { describe, expect, it } from 'vitest';
import {
  addressOf,
  firstNameOf,
  type ReceiptInput,
  type ReceiptLineInput,
  receiptOf,
} from './receipt.js';
import { RECEIPT_PALETTE } from './receipt-palette.js';

/** A no-break space, which Intl puts after "US$" and the receipt between a date's parts. */
const _ = ' ';

const melencolia: ReceiptLineInput = {
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
};

const wave: ReceiptLineInput = {
  title: 'Under the Wave off Kanagawa',
  artist: 'Katsushika Hokusai',
  date: 'ca. 1830–32',
  paperSize: 'A3',
  quantity: 2,
  unitPrice: 9000,
  linePrice: 18_000,
  editionSize: null,
  image: {
    url: 'http://localhost:8080/assets/preview/9a/45434__preview.webp',
    width: 2400,
    height: 1613,
  },
};

const order: ReceiptInput = {
  code: 'J3JTEWLYTBXV5QS3',
  placedAt: new Date('2026-10-08T15:07:34Z'),
  currency: 'USD',
  language: 'en',
  copyNumber: null,
  lines: [melencolia, wave],
  subtotal: 27_000,
  shipping: 1200,
  total: 28_200,
  address: {
    fullName: 'Ana Souza',
    streetLine1: '1000 Fifth Avenue',
    streetLine2: null,
    city: 'New York',
    postalCode: '10028',
    countryCode: 'US',
    country: 'United States of America',
  },
};

const copy: ReceiptInput = {
  ...order,
  code: '7BS85TNFPL4T3AQV',
  copyNumber: 6,
  lines: [{ ...melencolia, unitPrice: 18_000, linePrice: 18_000, editionSize: 50 }],
  subtotal: 18_000,
  shipping: 0,
  total: 18_000,
};

describe('receiptOf', () => {
  it("writes the receipt in English, as the store's order page reads", () => {
    const receipt = receiptOf(order);
    expect(receipt).toMatchObject({
      lang: 'en',
      subject: 'Your receipt for order J3JTEWLYTBXV5QS3',
      preview: '3 prints · $282',
      words: {
        placed: 'Order placed',
        thanks: 'Thank you, Ana',
        lede: `Here is the receipt for order J3JTEWLYTBXV5QS3, placed on 8${_}Oct${_}2026.`,
        order: 'Order J3JTEWLYTBXV5QS3',
        subtotal: 'Subtotal, 3 prints',
        shipping: 'Shipping, rolled in a tube',
        paidOn: `Test payment, settled on 8${_}Oct${_}2026`,
      },
      subtotal: '$270',
      shipping: '$12',
      total: '$282',
      address: 'Ana Souza, 1000 Fifth Avenue, New York 10028, United States',
    });
    expect(receipt.lines).toEqual([
      {
        thumb: {
          src: 'http://localhost:8080/assets/preview/31/336228__preview.webp?preset=thumb&format=jpg',
          width: 51,
          height: 64,
        },
        title: 'Melencolia I',
        maker: 'Albrecht Dürer, 1514',
        option: 'A3, unframed · $90 each',
        quantity: '× 1',
        total: '$90',
      },
      {
        thumb: {
          src: 'http://localhost:8080/assets/preview/9a/45434__preview.webp?preset=thumb&format=jpg',
          width: 64,
          height: 43,
        },
        title: 'Under the Wave off Kanagawa',
        maker: 'Katsushika Hokusai, ca. 1830–32',
        option: 'A3, unframed · $90 each',
        quantity: '× 2',
        total: '$180',
      },
    ]);
  });

  it('writes it in Portuguese for an order placed in the Portuguese edition', () => {
    const receipt = receiptOf({
      ...order,
      language: 'pt-BR',
      address: {
        ...order.address!,
        streetLine1: 'Avenida Paulista, 1578',
        city: 'São Paulo',
        postalCode: '01310-200',
        countryCode: 'BR',
        country: 'Brazil',
      },
    });
    expect(receipt).toMatchObject({
      lang: 'pt-BR',
      subject: 'Seu recibo do pedido J3JTEWLYTBXV5QS3',
      preview: `3 gravuras · US$${_}282`,
      words: {
        placed: 'Pedido feito',
        thanks: 'Obrigado, Ana',
        lede: `Este é o recibo do pedido J3JTEWLYTBXV5QS3, feito em 8${_}de${_}out.${_}de${_}2026.`,
        shipping: 'Frete, enrolada em tubo',
        nothingShipsTitle: 'Nada é enviado',
      },
      total: `US$${_}282`,
      address: 'Ana Souza, Avenida Paulista, 1578, São Paulo 01310-200, Brasil',
    });
    expect(receipt.lines[0]).toMatchObject({
      option: `A3, sem moldura · US$${_}90 cada`,
      // The museum's words stay the museum's.
      maker: 'Albrecht Dürer, 1514',
    });
  });

  it('receipts a numbered copy by its number, with shipping that costs nothing', () => {
    const receipt = receiptOf(copy);
    expect(receipt.words).toMatchObject({
      lede: `Here is the receipt for order 7BS85TNFPL4T3AQV, placed on 8${_}Oct${_}2026. Copy 6 of 50 is yours.`,
      subtotal: 'Subtotal, 1 print',
      shipping: 'Shipping for a numbered copy',
    });
    expect(receipt.lines[0]).toMatchObject({
      title: 'Melencolia I, copy 6 of 50',
      option: 'A3, numbered in pencil · $180',
    });
    expect(receipt.shipping).toBe('Free');
    expect(receiptOf({ ...copy, language: 'pt-BR' }).lines[0]?.title).toBe(
      'Melencolia I, exemplar 6 de 50',
    );
  });

  it('thanks no one by name where none was given, and leaves out what the order lacks', () => {
    const receipt = receiptOf({
      ...order,
      language: null,
      address: null,
      lines: [{ ...melencolia, artist: null, date: null, image: null }],
    });
    expect(receipt.lang).toBe('en');
    expect(receipt.words['thanks']).toBe('Thank you');
    expect(receipt.address).toBeNull();
    expect(receipt.lines[0]).toMatchObject({ thumb: null, maker: null });
  });

  it('colours itself from the tokens, in both themes', () => {
    expect(receiptOf(order)).toMatchObject({
      light: RECEIPT_PALETTE.light,
      dark: RECEIPT_PALETTE.dark,
    });
  });
});

describe('addressOf', () => {
  const address = {
    fullName: null,
    streetLine1: 'Rua Augusta, 1',
    streetLine2: null,
    city: null,
    postalCode: null,
    countryCode: 'XX',
    country: 'Nowhere',
  };

  it("keeps commerce's name for a country no locale names, and gives nothing for nothing", () => {
    expect(addressOf(address, 'pt-BR')).toBe('Rua Augusta, 1, Nowhere');
    expect(addressOf({ ...address, countryCode: 'not a code' }, 'en-US')).toBe(
      'Rua Augusta, 1, Nowhere',
    );
    expect(
      addressOf({ ...address, streetLine1: null, countryCode: null, country: null }, 'en-US'),
    ).toBeNull();
  });
});

describe('firstNameOf', () => {
  it('thanks the first name given', () => {
    expect(firstNameOf('  Ana  Souza ')).toBe('Ana');
    expect(firstNameOf(' ')).toBeNull();
    expect(firstNameOf(null)).toBeNull();
  });
});
