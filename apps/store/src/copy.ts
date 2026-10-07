import { ordinal } from './views/listing';

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
    collections: 'Collections',
    everyCollection: 'Every collection',
    journal: 'From the journal',
    everyStory: 'Every story',
  },
  prints: {
    title: 'The prints',
    lede: (total: string) =>
      `${total} works from The Met’s Open Access collection, each printed on cotton rag at the sizes its scan can hold.`,
    filters: 'Filter the prints',
    unit: 'prints',
    technique: 'Technique',
    centuryGroup: 'Century',
    century: (n: number) => ordinal(n),
    printedAt: 'Printed at',
    all: 'All',
    anySize: 'Any size',
    sizeAndUp: (size: string) => `${size} and up`,
    count: (shown: number, total: number | null) =>
      `${shown === 1 ? '1 print' : `${String(shown)} prints`}${
        total === null ? '' : ` of ${String(total)}`
      }, oldest first`,
    clear: 'Clear the filters',
    asideTitle: 'Why some prints stop at A4',
    aside:
      'Each size needs enough of the scan’s pixels for every inch of paper. Where The Met’s scan runs out, so do the sizes: we never print a work larger than its scan can hold.',
    howWeSize: 'How we size prints',
  },
  collections: {
    title: 'Collections',
    lede: 'Prints the editor put together, a few at a time, with a line on why they belong side by side.',
    see: (count: number) => `See the ${String(count)} prints`,
    prints: (count: number) => (count === 1 ? '1 print' : `${String(count)} prints`),
    crumbs: 'Breadcrumb',
    more: 'More collections',
    every: 'Every collection',
  },
  journal: {
    title: 'Journal',
    lede: 'Short pieces on the works: who made them, how, and what to look for. Every fact comes from The Met’s record, which each one cites.',
    more: 'More stories',
    readBeside: 'Read it beside the print',
  },
  sizes: {
    title: 'How we size prints',
    lede: (ppi: string) =>
      `A print is only as sharp as the scan behind it. We offer each work at the sizes its scan can fill at ${ppi} pixels for every inch of paper, and none larger.`,
    examples: 'Three scans, three limits',
    only: (size: string) => `${size} only`,
    upTo: (size: string) => `Up to ${size}`,
    example: (maker: string, width: string, height: string) =>
      `${maker}. The Met’s scan is ${width} × ${height} px.`,
    limit: (size: string, required: string, side: 'across' | 'down', scan: string) =>
      `${size} would need ${required} px ${side} the image; the scan has ${scan}.`,
    table: 'What each size takes',
    caption: (ppi: string) =>
      `Each sheet keeps a white border; the print sits inside it, at ${ppi} ppi or more.`,
    headers: {
      size: 'Size',
      area: 'Printed area',
      pixels: (ppi: string) => `At ${ppi} ppi`,
      works: 'Works that reach it',
    },
    note: 'A print keeps its proportions, so it meets the border across or down, and needs the pixels along that side.',
    noneAt: (size: string) =>
      `None of the scans The Met serves for these works is large enough for ${size}.`,
    rules: 'The rules behind it',
    density: (ppi: string) => `${ppi} pixels an inch`,
    densityText:
      'At that density, lines engraved a hair apart stay apart at arm’s length. Below it, the finest work starts to soften.',
    upscaled: 'Never upscaled',
    upscaledText:
      'Enlarging a scan invents the pixels it lacks, and invented pixels print as soft edges. Where a scan runs out, we stop at the size before.',
    file: 'Read from the file',
    fileText:
      'The Met’s API does not say how large an image is, so we read each scan’s own header. The numbers on a print’s page are the file’s, not an estimate.',
    browse: 'Browse the prints',
  },
  search: {
    title: 'Search',
    results: (query: string) => `Prints for “${query}”`,
    none: (query: string) => `No prints for “${query}”`,
    again: 'Search again',
    count: (n: number) => (n === 1 ? '1 print' : `${String(n)} prints`),
    nothing: (total: string) =>
      `The shop has ${total} works, and none of their titles, makers or techniques hold those words. Try a maker, a title or a technique:`,
    ask: 'Search the shop for a maker, a title or a technique:',
    suggestions: ['Hokusai', 'Melencolia', 'etching', 'Rembrandt'],
    browse: 'Browse the prints',
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
    crumbs: 'Breadcrumb',
    prints: 'Prints',
  },
  notFound: {
    title: 'This page is not here',
    text: 'The address may be mistyped, or the print may have left the shop. Every print we sell is on one page, and the search at the top finds any of them.',
    browse: 'Browse the prints',
    home: 'Go to the front page',
    mark: '404',
  },
};

export type Copy = typeof copy;
