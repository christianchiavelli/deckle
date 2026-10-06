/**
 * The store's words. Every page takes its text from here, never from a string
 * of its own, so the Portuguese edition is a second object of this shape.
 */

export interface SizingText {
  readonly work: string;
  readonly side: 'across' | 'tall';
  readonly scan: string;
  readonly largest: string;
  readonly ppi: string;
  readonly next: string | null;
  readonly required: string | null;
}

export const copy = {
  locale: 'en-US',
  chrome: {
    skip: 'Skip to content',
    home: 'Deckle, home',
    nav: 'Shop',
    prints: 'Prints',
    drops: 'Drops',
    collections: 'Collections',
    journal: 'Journal',
    search: 'Search',
    searchPlaceholder: 'Search prints, artists and techniques',
    theme: 'Theme',
    account: 'Sign in with a passkey',
    cart: (count: number) =>
      count === 0 ? 'Cart, empty' : count === 1 ? 'Cart, 1 print' : `Cart, ${String(count)} prints`,
    menuOpen: 'Menu',
    menuClose: 'Close the menu',
    footer: 'Footer',
    about: 'Prints of public-domain works from The Met, in the sizes their scans can hold.',
    shop: 'Shop',
    aboutColumn: 'About',
    howWeSize: 'How we size prints',
    howDropsWork: 'How drops work',
    small:
      'Images: The Metropolitan Museum of Art, Open Access (CC0). Deckle is a portfolio project: checkout is simulated and nothing ships.',
  },
  home: {
    title: 'Prints from The Met, at the sizes their scans can hold',
    intro: (total: string) =>
      `${total} works from the museum’s Open Access collection, from Dürer to Hiroshige, printed on cotton rag from The Met’s own scans. Never upscaled, so a line engraved in 1514 stays a line.`,
    browse: 'Browse the prints',
    howWeSize: 'How we size prints',
    prints: 'The prints',
    seeAll: (total: string) => `See all ${total} prints`,
    sizingTitle: 'How large can a print be?',
    sizing: ({ work, side, scan, largest, ppi, next, required }: SizingText) =>
      [
        'Every inch of paper needs 240 of the scan’s pixels, or fine lines start to soften at arm’s length.',
        `The Met’s scan of ${work} is ${scan} pixels ${side}: enough for ${largest} at ${ppi}.`,
        next === null || required === null
          ? `That is the largest sheet we print.`
          : `${next} would need ${required}, so we print it up to ${largest} and no larger.`,
      ].join(' '),
    printed: 'Printed',
    tooFewPixels: 'Too few pixels',
  },
  tile: {
    from: (amount: string) => `From ${amount}`,
    only: (size: string) => `${size} only`,
  },
  work: {
    size: 'Size',
    unframed: (size: string) => `${size}, unframed`,
    notForSale: 'Not for sale',
    unavailable: 'Scan too small',
    missingPrice: 'Price not set',
    tooSmall: (size: string, required: string, side: 'across' | 'down', scan: string) =>
      `${size} would need ${required} px ${side} the image. The Met’s scan has ${scan}, and we never upscale.`,
    caption: (width: string, height: string) => `The Met’s scan · ${width} × ${height} px`,
    zoom: 'Inspect the detail',
    printedAt: (ppi: string, size: string) =>
      `Printed at ${ppi} on ${size}, from the museum’s own scan`,
    paper: 'Pigment print on cotton rag, shipped rolled in a tube',
    openAccess: 'Public domain, from The Met’s Open Access collection',
    source: 'Source',
    recordTitle: 'From the museum’s record',
    museum: 'metmuseum.org',
    missing: 'Not recorded',
    record: {
      artist: 'Artist',
      date: 'Date',
      medium: 'Medium',
      dimensions: 'Dimensions',
      culture: 'Culture',
      period: 'Period',
      creditLine: 'Credit line',
      objectNumber: 'Object number',
      rights: 'Rights',
      scan: 'Scan',
    },
    rights: 'Public domain, Open Access (CC0)',
    scan: (width: string, height: string) => `${width} × ${height} px, read from the file`,
    unknownArtist: 'Unknown maker',
    more: 'More prints',
  },
  notFound: {
    title: 'This page is not here',
    text: 'It may not be printed yet, or the address may be wrong.',
    home: 'Back to the front page',
  },
};

export type Copy = typeof copy;
