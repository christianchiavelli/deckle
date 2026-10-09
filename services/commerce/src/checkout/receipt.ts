import type { ReceiptLanguage } from '../catalogue/custom-fields.js';
import { type Palette, RECEIPT_PALETTE } from './receipt-palette.js';
import { RECEIPT_WORDS, type ReceiptWords } from './receipt-words.js';

/** The side, in pixels, of the square a line's picture sits in. */
const THUMB = 64;

/** One line of an order, as the receipt reads it off the order. */
export interface ReceiptLineInput {
  /** The work's title, also for a numbered copy, whose product is named after its drop. */
  readonly title: string;
  readonly artist: string | null;
  readonly date: string | null;
  /** "A3", or the variant's own name where it has no paper size. */
  readonly paperSize: string;
  readonly quantity: number;
  /** Minor units, as commerce keeps money. */
  readonly unitPrice: number;
  readonly linePrice: number;
  /** How many copies the edition has; null for an open edition. */
  readonly editionSize: number | null;
  /** The picture's address at full size, and its size. */
  readonly image: { readonly url: string; readonly width: number; readonly height: number } | null;
}

export interface ReceiptAddressInput {
  readonly fullName: string | null;
  readonly streetLine1: string | null;
  readonly streetLine2: string | null;
  readonly city: string | null;
  readonly postalCode: string | null;
  readonly countryCode: string | null;
  /** Commerce's name for the country, in English: the fallback for a code no locale names. */
  readonly country: string | null;
}

/** What a receipt needs of a placed order. */
export interface ReceiptInput {
  readonly code: string;
  readonly placedAt: Date;
  readonly currency: string;
  /** The language the order was placed in; null for an order from before it was kept. */
  readonly language: ReceiptLanguage | null;
  /** The copy's number, when the order is a drop's numbered copy. */
  readonly copyNumber: number | null;
  readonly lines: readonly ReceiptLineInput[];
  readonly subtotal: number;
  readonly shipping: number;
  readonly total: number;
  readonly address: ReceiptAddressInput | null;
}

export interface ReceiptLine {
  readonly thumb: { readonly src: string; readonly width: number; readonly height: number } | null;
  readonly title: string;
  readonly maker: string | null;
  readonly option: string;
  readonly quantity: string;
  readonly total: string;
}

/** Everything the receipt's template prints, written out in the order's language. */
export interface Receipt {
  readonly lang: string;
  readonly subject: string;
  /** The line a mail app shows after the subject, before the mail is opened. */
  readonly preview: string;
  readonly words: Readonly<Record<string, string>>;
  readonly lines: readonly ReceiptLine[];
  readonly subtotal: string;
  readonly shipping: string;
  readonly total: string;
  readonly address: string | null;
  readonly light: Palette;
  readonly dark: Palette;
}

/** A date's parts held together: "8 de out. de 2026" never breaks across lines. */
const unbroken = (text: string) => text.replaceAll(' ', ' ');

/** "Ana", from "Ana Souza": the receipt thanks the first name given, as the store's order page does. */
export function firstNameOf(fullName: string | null): string | null {
  const [first] = (fullName ?? '').trim().split(/\s+/);
  return first === undefined || first === '' ? null : first;
}

/** A country's name in the receipt's language, from its code; commerce names each in English. */
export function countryNameOf(code: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' }).of(code) ?? null;
  } catch {
    // Not shaped like a region code at all.
    return null;
  }
}

/** "Ana Souza, Avenida Paulista, 1578, São Paulo 01310-200, Brasil", as the store writes it. */
export function addressOf(address: ReceiptAddressInput | null, locale: string): string | null {
  if (address === null) {
    return null;
  }
  const place = [address.city, address.postalCode].filter(Boolean).join(' ');
  const country =
    (address.countryCode === null ? null : countryNameOf(address.countryCode, locale)) ??
    address.country;
  const parts = [address.fullName, address.streetLine1, address.streetLine2, place, country].filter(
    (part): part is string => part !== null && part !== '',
  );
  return parts.length === 0 ? null : parts.join(', ');
}

/** The picture at the asset server's thumbnail size, as JPEG, which every mail app shows. */
function thumbOf(image: ReceiptLineInput['image']): ReceiptLine['thumb'] {
  if (image === null || image.width <= 0 || image.height <= 0) {
    return null;
  }
  const scale = THUMB / Math.max(image.width, image.height);
  const separator = image.url.includes('?') ? '&' : '?';
  return {
    src: `${image.url}${separator}preset=thumb&format=jpg`,
    width: Math.round(image.width * scale),
    height: Math.round(image.height * scale),
  };
}

export function receiptOf(input: ReceiptInput): Receipt {
  const language = input.language ?? 'en';
  const words: ReceiptWords = RECEIPT_WORDS[language];
  const money = (minor: number) =>
    new Intl.NumberFormat(words.locale, {
      style: 'currency',
      currency: input.currency,
      trailingZeroDisplay: 'stripIfInteger',
    }).format(minor / 100);
  const date = unbroken(
    new Intl.DateTimeFormat(words.dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(input.placedAt),
  );
  const copy = input.copyNumber;
  const prints = words.prints(input.lines.reduce((sum, line) => sum + line.quantity, 0));
  const total = money(input.total);

  const lines = input.lines.map((line): ReceiptLine => {
    const each = money(line.unitPrice);
    const maker = [line.artist, line.date].filter(Boolean).join(', ');
    const numbered =
      copy === null || line.editionSize === null ? null : { number: copy, of: line.editionSize };
    return {
      thumb: thumbOf(line.image),
      title:
        numbered === null ? line.title : words.copyTitle(line.title, numbered.number, numbered.of),
      maker: maker === '' ? null : maker,
      option:
        numbered === null
          ? words.unframed(line.paperSize, each)
          : words.numbered(line.paperSize, each),
      quantity: `× ${String(line.quantity)}`,
      total: money(line.linePrice),
    };
  });
  const editionSize = input.lines.find((line) => line.editionSize !== null)?.editionSize ?? null;
  const yours = copy !== null && editionSize !== null ? ` ${words.yours(copy, editionSize)}` : '';

  return {
    lang: language,
    subject: words.subject(input.code),
    preview: `${prints} · ${total}`,
    words: {
      placed: words.placed,
      thanks: words.thanks(firstNameOf(input.address?.fullName ?? null)),
      lede: `${words.lede(input.code, date)}${yours}`,
      order: words.order(input.code),
      subtotal: words.subtotal(prints),
      shipping: copy === null ? words.shipping : words.copyShipping,
      total: words.total,
      shipTo: words.shipTo,
      paid: words.paid,
      paidOn: words.paidOn(date),
      nothingShipsTitle: words.nothingShipsTitle,
      nothingShips: words.nothingShips,
      about: words.about,
      credit: words.credit,
    },
    lines,
    subtotal: money(input.subtotal),
    shipping: input.shipping === 0 ? words.free : money(input.shipping),
    total,
    address: addressOf(input.address, words.locale),
    light: RECEIPT_PALETTE.light,
    dark: RECEIPT_PALETTE.dark,
  };
}
