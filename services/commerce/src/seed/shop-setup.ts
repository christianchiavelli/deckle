/**
 * How the shop sells, as the brief fixes it: US dollars, prices that include tax,
 * one zone with a 0 % rate, one flat shipping method and Vendure's dummy payment.
 */

export const SHIPPING_ZONE = 'Worldwide';

/**
 * Where a rolled print travels by post without customs paperwork beyond a declaration:
 * North America, Europe, and the larger markets of the Pacific.
 */
export const COUNTRIES: readonly { code: string; name: string }[] = [
  { code: 'US', name: 'United States of America' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'DK', name: 'Denmark' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'GR', name: 'Greece' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'Republic of Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
];

export const TAX_CATEGORY = 'Prints';

export const TAX_RATE = { name: 'No tax', percentage: 0 } as const;

export interface ShippingMethodSetup {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  /** USD cents, taxes included. */
  readonly price: number;
  /** The eligibility checker's code and its arguments. */
  readonly checker: {
    readonly code: string;
    readonly arguments: { name: string; value: string }[];
  };
}

export const SHIPPING_METHOD = {
  code: 'standard-shipping',
  name: 'Standard shipping',
  description: 'Rolled in a tube, tracked, one flat rate wherever it goes.',
  price: 1200,
  checker: {
    code: 'default-shipping-eligibility-checker',
    arguments: [{ name: 'orderMinimum', value: '0' }],
  },
} as const satisfies ShippingMethodSetup;

/** A drop's copy ships at no charge: its price includes the tube and the post. */
export const NUMBERED_COPY_SHIPPING = {
  code: 'numbered-copy-shipping',
  name: 'Shipping for a numbered copy',
  description: 'Rolled in a tube, tracked, and included in the price of a numbered copy.',
  price: 0,
  checker: { code: 'numbered-copies-only', arguments: [] },
} as const satisfies ShippingMethodSetup;

export const PAYMENT_METHOD = {
  code: 'dummy',
  name: 'Test payment',
  description: 'Settles at once; no money moves. Deckle takes no real payments.',
} as const;
