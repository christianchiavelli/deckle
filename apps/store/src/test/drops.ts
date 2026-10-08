import type { CopyState, DropSummaryFragment } from '../gateway/generated';
import type {
  CartLineViewFragment,
  CartViewFragment,
  PlacedOrderViewFragment,
} from '../live/generated';
import type { Stock } from '../views/drops';
import { greatWave, melencolia } from './works';

/**
 * Drops, carts and orders shaped as the gateway sends them, around the two
 * drops the stack opens with.
 */

export const NOW = Date.parse('2026-10-07T12:00:00Z');

const artworkOf = (work: typeof melencolia) => ({
  slug: work.slug,
  title: work.title,
  date: work.date,
  artist: work.artist && { name: work.artist.name },
  image: work.image,
  sizes: work.sizes,
});

export const melencoliaDrop: DropSummaryFragment = {
  slug: 'melencolia-i-numbered',
  artworkSlug: 'melencolia-i',
  opensAt: '2026-10-07T09:00:00.000Z',
  editionSize: 50,
  paperSize: 'A3',
  price: { amount: 18_000, currencyCode: 'USD' },
  page: {
    headline: 'Melencolia I, in fifty numbered copies',
    blocks: [
      {
        __typename: 'ParagraphBlock',
        text: [
          {
            text: 'Each copy is A3, printed from The Met’s scan at ',
            bold: false,
            italic: false,
            href: null,
          },
          { text: '302 ppi', bold: true, italic: false, href: null },
          { text: '.', bold: false, italic: false, href: null },
        ],
      },
      { __typename: 'HeadingBlock' },
    ],
  },
  artwork: artworkOf(melencolia),
};

export const waveDrop: DropSummaryFragment = {
  ...melencoliaDrop,
  slug: 'the-great-wave-numbered',
  artworkSlug: 'under-the-wave-off-kanagawa',
  opensAt: '2026-10-15T18:00:00.000Z',
  page: null,
  artwork: artworkOf(greatWave),
};

/** A drop's stock with `held` copies held and `sold` sold, from copy 1 up. */
export function stockOf(size: number, sold: number, held: number): Stock {
  const copies: CopyState[] = Array.from({ length: size }, (_, index) =>
    index < sold ? 'SOLD' : index < sold + held ? 'HELD' : 'OPEN',
  );
  return { open: size - sold - held, held, sold, copies };
}

const money = (amount: number) => ({ __typename: 'Money' as const, amount, currencyCode: 'USD' });

export function cartLine(
  overrides: Partial<CartLineViewFragment> & Pick<CartLineViewFragment, 'id'>,
): CartLineViewFragment {
  return {
    __typename: 'OrderLine',
    artworkSlug: 'melencolia-i',
    size: 'A3',
    quantity: 1,
    unitPrice: money(9000),
    price: money(9000),
    artwork: {
      __typename: 'Artwork',
      slug: 'melencolia-i',
      title: 'Melencolia I',
      date: '1514',
      artist: { __typename: 'Artist', name: 'Albrecht Dürer' },
      image: {
        __typename: 'ArtworkImage',
        url: 'http://localhost:8080/assets/source/melencolia-i.webp',
        width: 1901,
        height: 2400,
      },
    },
    ...overrides,
  };
}

export const cart: CartViewFragment = {
  __typename: 'Cart',
  quantity: 3,
  lines: [
    cartLine({ id: '11' }),
    cartLine({
      id: '12',
      artworkSlug: 'under-the-wave-off-kanagawa',
      quantity: 2,
      price: money(18_000),
      artwork: null,
    }),
  ],
  subtotal: money(27_000),
  shipping: money(1200),
  total: money(28_200),
};

const address = {
  __typename: 'ShippingAddress' as const,
  fullName: 'Ana Souza',
  streetLine1: '1000 Fifth Avenue',
  streetLine2: null,
  city: 'New York',
  postalCode: '10028',
  countryCode: 'US',
  country: 'United States of America',
};

export const placedOrder: PlacedOrderViewFragment = {
  __typename: 'PlacedOrder',
  code: 'DCK7X2Q',
  email: 'ana@example.com',
  placedAt: '2026-10-07T15:30:00.000Z',
  shipTo: address,
  lines: cart.lines.map((line) => ({ ...line, drop: null, copyNumber: null, editionSize: null })),
  subtotal: money(27_000),
  shipping: money(1200),
  total: money(28_200),
};

export const copyOrder: PlacedOrderViewFragment = {
  ...placedOrder,
  code: 'DCKCOPY7',
  lines: [
    {
      ...cartLine({ id: '21', unitPrice: money(18_000), price: money(18_000) }),
      drop: 'melencolia-i-numbered',
      copyNumber: 7,
      editionSize: 50,
    },
  ],
  subtotal: money(18_000),
  shipping: money(0),
  total: money(18_000),
};
