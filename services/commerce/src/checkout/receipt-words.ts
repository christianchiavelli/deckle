import type { ReceiptLanguage } from '../catalogue/custom-fields.js';

/**
 * A receipt's words in one of the store's two editions. Where the store's order
 * page says the same thing, the receipt says it in the same words; the museum's
 * own, a work's title and maker, stay as The Met wrote them.
 */
export interface ReceiptWords {
  /** Money and numbers. */
  readonly locale: string;
  /** Dates, as the store writes them: "8 Oct 2026", "8 de out. de 2026". */
  readonly dateLocale: string;
  readonly subject: (code: string) => string;
  readonly placed: string;
  readonly thanks: (name: string | null) => string;
  readonly lede: (code: string, date: string) => string;
  readonly yours: (number: number, size: number) => string;
  readonly order: (code: string) => string;
  readonly prints: (count: number) => string;
  readonly subtotal: (prints: string) => string;
  readonly shipping: string;
  readonly copyShipping: string;
  readonly free: string;
  readonly total: string;
  readonly unframed: (size: string, each: string) => string;
  readonly numbered: (size: string, price: string) => string;
  readonly copyTitle: (title: string, number: number, size: number) => string;
  readonly shipTo: string;
  readonly paid: string;
  readonly paidOn: (date: string) => string;
  readonly nothingShipsTitle: string;
  readonly nothingShips: string;
  readonly about: string;
  readonly credit: string;
}

const en: ReceiptWords = {
  locale: 'en-US',
  dateLocale: 'en-GB',
  subject: (code) => `Your receipt for order ${code}`,
  placed: 'Order placed',
  thanks: (name) => (name === null ? 'Thank you' : `Thank you, ${name}`),
  lede: (code, date) => `Here is the receipt for order ${code}, placed on ${date}.`,
  yours: (number, size) => `Copy ${String(number)} of ${String(size)} is yours.`,
  order: (code) => `Order ${code}`,
  prints: (count) => (count === 1 ? '1 print' : `${String(count)} prints`),
  subtotal: (prints) => `Subtotal, ${prints}`,
  shipping: 'Shipping, rolled in a tube',
  copyShipping: 'Shipping for a numbered copy',
  free: 'Free',
  total: 'Total',
  unframed: (size, each) => `${size}, unframed · ${each} each`,
  numbered: (size, price) => `${size}, numbered in pencil · ${price}`,
  copyTitle: (title, number, size) => `${title}, copy ${String(number)} of ${String(size)}`,
  shipTo: 'Shipping to',
  paid: 'Paid',
  paidOn: (date) => `Test payment, settled on ${date}`,
  nothingShipsTitle: 'Nothing ships',
  nothingShips:
    'Deckle is a portfolio project: the order is real, the payment and the parcel are not.',
  about: 'Prints of public-domain works from The Met, in the sizes their scans can hold.',
  credit: 'Images: The Metropolitan Museum of Art, Open Access (CC0).',
};

const ptBR: ReceiptWords = {
  locale: 'pt-BR',
  dateLocale: 'pt-BR',
  subject: (code) => `Seu recibo do pedido ${code}`,
  placed: 'Pedido feito',
  thanks: (name) => (name === null ? 'Obrigado' : `Obrigado, ${name}`),
  lede: (code, date) => `Este é o recibo do pedido ${code}, feito em ${date}.`,
  yours: (number, size) => `O exemplar ${String(number)} de ${String(size)} é seu.`,
  order: (code) => `Pedido ${code}`,
  prints: (count) => (count === 1 ? '1 gravura' : `${String(count)} gravuras`),
  subtotal: (prints) => `Subtotal, ${prints}`,
  shipping: 'Frete, enrolada em tubo',
  copyShipping: 'Frete de um exemplar numerado',
  free: 'Grátis',
  total: 'Total',
  unframed: (size, each) => `${size}, sem moldura · ${each} cada`,
  numbered: (size, price) => `${size}, numerado a lápis · ${price}`,
  copyTitle: (title, number, size) => `${title}, exemplar ${String(number)} de ${String(size)}`,
  shipTo: 'Entrega para',
  paid: 'Pago',
  paidOn: (date) => `Pagamento de teste, aprovado em ${date}`,
  nothingShipsTitle: 'Nada é enviado',
  nothingShips: 'O Deckle é um projeto de portfólio: o pedido é real, o pagamento e o pacote não.',
  about:
    'Gravuras de obras em domínio público do Met, nos tamanhos que suas digitalizações aguentam.',
  credit: 'Imagens: The Metropolitan Museum of Art, Open Access (CC0).',
};

export const RECEIPT_WORDS: Readonly<Record<ReceiptLanguage, ReceiptWords>> = {
  en,
  'pt-BR': ptBR,
};
