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

/** Joins "1 artist" and "4 prints" the way English does. */
const LIST = new Intl.ListFormat('en-US', { type: 'conjunction' });

/** "1 print", "3 prints". */
const prints = (count: number) => (count === 1 ? '1 print' : `${String(count)} prints`);

/** "1 minute", "3 minutes": a unit said in a sentence. */
const unit = (count: number, one: string) => `${String(count)} ${one}${count === 1 ? '' : 's'}`;

export const copy = {
  locale: 'en-US',
  /** Dates are written day first, as the approved pages have them: "Thu 15 Oct", "7 Oct 2026". */
  dateLocale: 'en-GB',
  chrome: {
    skip: 'Skip to content',
    home: 'Deckle, home',
    nav: 'Shop',
    prints: 'Prints',
    collections: 'Collections',
    journal: 'Journal',
    search: 'Search',
    searchPlaceholder: 'Search prints, artists and techniques',
    theme: 'Theme',
    menuOpen: 'Menu',
    menuClose: 'Close the menu',
    footer: 'Footer',
    about: 'Prints of public-domain works from The Met, in the sizes their scans can hold.',
    shop: 'Shop',
    aboutColumn: 'About',
    howWeSize: 'How we size prints',
    drops: 'Drops',
    howDropsWork: 'How drops work',
    signIn: 'Sign in with a passkey',
    account: 'Your account',
    cart: (count: number) => `Cart, ${prints(count)}`,
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
    suggest: {
      label: 'Suggestions',
      artists: 'Artists',
      techniques: 'Techniques',
      prints: 'Prints',
      all: (count: number, query: string) =>
        count === 1 ? `1 print for “${query}”` : `All ${String(count)} prints for “${query}”`,
      none: (query: string) => `No prints, artists or techniques match “${query}”`,
      /** "1 artist and 4 prints": what a screen reader hears as the list changes. */
      status: (artists: number, techniques: number, prints: number) =>
        LIST.format(
          [
            [artists, 'artist', 'artists'] as const,
            [techniques, 'technique', 'techniques'] as const,
            [prints, 'print', 'prints'] as const,
          ]
            .filter(([count]) => count > 0)
            .map(([count, one, many]) => `${String(count)} ${count === 1 ? one : many}`),
        ),
    },
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
  added: {
    title: 'Added to your cart',
    detail: (size: string, price: string) => `${size}, unframed · ${price}`,
    summary: (count: number, subtotal: string) => `${prints(count)} in your cart · ${subtotal}`,
    cart: 'View cart',
    checkout: 'Check out',
    close: 'Close',
    add: 'Add to cart',
    adding: 'Adding…',
    failed: 'The print could not be added just now. Try again in a moment.',
  },
  cart: {
    title: 'Your cart',
    lede: 'Each print is made when it is ordered: pigment on cotton rag, rolled in a tube.',
    emptyTitle: 'Your cart is empty',
    emptyLede:
      'Each print is made when it is ordered, at the sizes its scan can hold. Every one the shop sells is on one page.',
    browse: 'Browse the prints',
    size: (size: string, price: string) => `${size}, unframed · ${price} each`,
    quantity: (title: string, size: string) => `How many of ${title}, ${size}`,
    fewer: 'One fewer',
    more: 'One more',
    remove: 'Remove',
    summary: 'Order summary',
    subtotal: (count: number) => `Subtotal, ${prints(count)}`,
    shipping: 'Shipping, rolled in a tube',
    total: 'Total',
    checkout: 'Check out',
    keepBrowsing: 'Keep browsing',
    testTitle: 'A test checkout',
    test: 'No card is asked for and nothing ships: Deckle is a portfolio project.',
    failed: 'The cart could not be read just now. Try again in a moment.',
    changeFailed: 'That change did not go through. Try again in a moment.',
  },
  checkout: {
    title: 'Checkout',
    crumbs: 'Breadcrumb',
    cart: 'Cart',
    contact: 'Contact',
    contactLede: 'For the receipt. Nothing else is sent to it.',
    email: 'Email',
    address: 'Shipping address',
    fullName: 'Full name',
    street: 'Address',
    street2: 'Apartment, suite or floor',
    street2Hint: 'If there is one',
    city: 'City',
    postalCode: 'Postcode',
    country: 'Country',
    delivery: 'Delivery',
    standard: 'Standard shipping',
    numbered: 'Shipping for a numbered copy',
    tube: 'Rolled in a tube, tracked, one flat rate wherever it goes.',
    included: 'Included',
    payment: 'Payment',
    testTitle: 'A test payment',
    test: 'It settles at once and no money moves. Deckle is a portfolio project: the order is real, the payment and the parcel are not.',
    place: (total: string) => `Place order · ${total}`,
    placing: 'Placing your order…',
    summary: 'Your order',
    invalid: {
      email: 'Enter an email address, such as you@example.com',
      fullName: 'Enter the name the tube goes to',
      streetLine1: 'Enter the street and the number',
      streetLine2: 'Keep it under 120 characters',
      city: 'Enter a city',
      postalCode: 'Enter a postcode',
      countryCode: 'Choose a country',
    },
    paymentFailed: 'The test payment did not go through, and nothing was charged. Try again.',
    failed: 'The order could not be placed just now. Try again in a moment.',
    copyRow: (number: number, size: number) => `Copy ${String(number)} of ${String(size)}`,
    copyTitle: (title: string, number: number, size: number) =>
      `${title}, copy ${String(number)} of ${String(size)}`,
    copySize: (paper: string, number: number, size: number) =>
      `${paper}, numbered ${String(number)}/${String(size)} in pencil`,
    held: (left: string) => `Held for you · ${left} left`,
    heldText: (number: number) =>
      `Pay before the time runs out, or copy ${String(number)} goes back to the edition for the next person.`,
    notHeldTitle: 'This copy is no longer held for you',
    notHeld:
      'Its ten minutes ran out, or it has been paid for. The drop’s page shows where its copies stand.',
    toDrop: 'Back to the drop',
    inProgress: 'A payment for this copy is already under way: give it a moment.',
  },
  order: {
    placed: 'Order placed',
    thanks: (name: string | null) => (name === null ? 'Thank you' : `Thank you, ${name}`),
    lede: (code: string, email: string | null) =>
      email === null
        ? `Order ${code} is placed.`
        : `Order ${code} is placed, and its receipt is on its way to ${email}.`,
    title: (code: string) => `Order ${code}`,
    shipTo: 'Shipping to',
    paid: 'Paid',
    paidOn: (date: string) => `Test payment, settled on ${date}`,
    nothingShipsTitle: 'Nothing ships',
    nothingShips:
      'Deckle is a portfolio project: the order is in commerce’s dashboard and the receipt in Mailpit, and the prints stay in the museum.',
    keepBrowsing: 'Keep browsing',
    missingTitle: 'This order is not here',
    missing:
      'An order shows only in the browser that placed it, and its receipt has every detail. The prints are all on one page.',
    browse: 'Browse the prints',
  },
  drops: {
    title: 'Drops',
    lede: 'Fifty numbered copies of one print at a time, at a set hour: first come, first served, and one per person.',
    headline: (title: string, size: number) => `${title}, in ${String(size)} numbered copies`,
    openNow: 'Open now',
    opens: (day: string) => `Opens ${day}`,
    allClaimed: 'Every copy claimed',
    open: 'Open',
    openOf: (open: number, size: number) => `${String(open)} of ${String(size)}`,
    opensTerm: 'Opens',
    price: 'Price',
    limit: 'Limit',
    onePerPerson: 'One per person',
    at: (day: string, time: string) => `${day}, ${time} UTC`,
    claim: 'Claim a copy',
    see: 'See the drop',
    announceOpen: (title: string) => `${title}, in numbered copies, is open now`,
    announceSoon: (title: string, day: string, time: string) =>
      `A numbered edition of ${title} opens on ${day} at ${time} UTC`,
    callout: (size: number) => `A numbered edition of ${String(size)}`,
    calloutOpen: 'Open now. One per person, with a passkey',
    calloutSoon: (day: string, time: string) =>
      `Opens ${day}, ${time} UTC. One per person, with a passkey`,
    join: 'Join with a passkey',
    readyWithPasskey: 'Get ready with a passkey',
    howTheyWork: 'How drops work',
    copyWords: {
      open: 'open',
      held: 'held while someone pays',
      claimed: 'claimed',
      yours: 'yours',
    },
    tally: { open: 'open', held: 'held', claimed: 'claimed' },
    noneClaimed: (size: number) => `${String(size)} copies · none claimed yet`,
    standing: (size: number, claimed: number, held: number, open: number) =>
      `${String(size)} copies · ${String(claimed)} claimed · ${String(held)} held · ${String(open)} open`,
    copiesLabel: (size: number, open: number) =>
      `Copies 1 to ${String(size)}, ${String(open)} open`,
    opensIn: (parts: { days: number; hours: number; minutes: number }) =>
      `Opens in ${LIST.format(
        [
          parts.days > 0 ? unit(parts.days, 'day') : null,
          parts.days > 0 || parts.hours > 0 ? unit(parts.hours, 'hour') : null,
          unit(parts.minutes, 'minute'),
        ].filter((part) => part !== null),
      )}`,
    leftToPay: (parts: { minutes: number; seconds: number }) =>
      `${LIST.format([unit(parts.minutes, 'minute'), unit(parts.seconds, 'second')])} left to pay`,
    units: { days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds' },
  },
  drop: {
    crumbs: 'Breadcrumb',
    soon: (days: number) =>
      days < 1 ? 'Opens today' : days === 1 ? 'Opens tomorrow' : `Opens in ${String(days)} days`,
    openNow: 'Open now',
    held: 'Held for you',
    yours: 'Yours',
    allClaimed: 'Every copy claimed',
    heldTitle: (number: number, size: number) =>
      `Copy ${String(number)} of ${String(size)} is yours for ten minutes`,
    heldText: (number: number, size: number) =>
      `Pay before the time runs out and it is printed, numbered ${String(number)}/${String(size)} in pencil and shipped rolled in a tube. If you don’t, it goes back to the edition for the next person.`,
    soldTitle: (number: number, size: number) =>
      `Copy ${String(number)} of ${String(size)} is yours`,
    soldText: (number: number, size: number) =>
      `It is paid for: printed, numbered ${String(number)}/${String(size)} in pencil and shipped rolled in a tube.`,
    order: 'See the order',
    pay: (price: string) => `Pay ${price}`,
    letGo: 'Let it go',
    claiming: 'Claiming…',
    small: 'You sign in with a passkey first: no password to remember, and one copy per person.',
    noneOpen: 'Every copy is held or claimed. A held one comes back if its ten minutes run out.',
    refused: {
      NO_SUCH_DROP: 'This drop is not in the shop any more.',
      DROP_NOT_OPEN: 'The drop has not opened yet.',
      NO_COPY_OPEN: 'Every copy is held or claimed just now. A held one may come back.',
      ALREADY_HAS_COPY: 'One copy per person, and this account has one of this drop.',
      HOLDING_ANOTHER: 'Pay for the copy you hold in another drop, or let it go, first.',
      UNAUTHENTICATED: 'Sign in with a passkey first.',
    },
    failed: 'That did not go through. Try again in a moment.',
    copiesTitle: (size: number) =>
      size === 50 ? 'The fifty copies' : `The ${String(size)} copies`,
    live: 'Updates as they are claimed',
    copiesText:
      'Each square is one copy. The next open number goes to whoever claims next, and a held copy comes back if its ten minutes run out.',
    howTitle: 'How a drop works',
    steps: [
      {
        title: 'Sign in with a passkey',
        text: 'Your fingerprint, face or device PIN, never a password. A passkey belongs to one person, which is how one copy each holds.',
      },
      {
        title: 'Claim a copy',
        text: 'The next open number is held for you for ten minutes. If you don’t pay in time, it goes back to the edition.',
      },
      {
        title: 'We print and number it',
        text: 'Pigment on cotton rag, numbered in pencil, and shipped rolled in a tube.',
      },
    ],
    printTitle: 'The print',
    record: {
      size: 'Size',
      resolution: 'Resolution',
      paper: 'Paper',
      edition: 'Edition',
      price: 'Price',
      limit: 'Limit',
    },
    sizeOf: (size: string, paper: string) => `${size}, ${paper}`,
    resolutionOf: (ppi: string, width: string, height: string) =>
      `${ppi}, from The Met’s scan of ${width} × ${height} px`,
    paper: 'Cotton rag, pigment inks',
    editionOf: (size: number) =>
      `${String(size)} copies, numbered 1/${String(size)} to ${String(size)}/${String(size)}`,
    missing: 'Not set',
  },
  passkey: {
    title: 'Claim with a passkey',
    text: 'A copy is one per person, so a drop asks who you are: with a passkey your device keeps, made once here or used again.',
    use: 'Use my passkey',
    make: 'Make a passkey',
    waiting: 'Waiting for your device…',
    failed:
      'Your device did not answer. Try again, or make a passkey if this device has none for Deckle.',
    unsupported:
      'This browser cannot make or use a passkey. A current Chrome, Edge, Firefox or Safari can.',
    small:
      'Deckle keeps only the passkey’s public half. Your face, finger or PIN stay on your device.',
    close: 'Close',
  },
  account: {
    signInTitle: 'Sign in with a passkey',
    signInLede:
      'Your account is a passkey your device keeps: no password to choose, remember or leak. It is only needed for drops; prints in the cart need none.',
    keepsTitle: 'What Deckle keeps',
    keeps:
      'The passkey’s public half and a number that tells this account apart. Your face, finger or PIN stay on your device.',
    title: 'Your account',
    since: (date: string) => `Signed in with a passkey made on ${date}.`,
    copies: 'Your copies',
    noCopies: 'No copies yet. A drop’s numbered copies are claimed on its page.',
    seeDrops: 'See the drops',
    heldChip: (left: string) => `Held for you · ${left} left`,
    paidChip: 'Paid',
    copyTitle: (title: string, number: number, size: number) =>
      `${title}, copy ${String(number)} of ${String(size)}`,
    copyDetail: (paper: string, price: string) => `${paper}, numbered in pencil · ${price}`,
    pay: (price: string) => `Pay ${price}`,
    order: (code: string) => `Order ${code}`,
    signOut: 'Sign out',
    failed: 'The account could not be read just now. Try again in a moment.',
  },
  howDrops: {
    title: 'How drops work',
    lede: 'A drop is fifty numbered copies of one print, released at a set hour. Whoever comes first takes the next number, and nobody takes two.',
    stepsTitle: 'Three steps',
    steps: [
      {
        title: 'Sign in with a passkey',
        text: 'Your device makes one the first time, with your face, your finger or its PIN. There is no password, and one passkey is one person.',
      },
      {
        title: 'Claim a copy',
        text: 'The next open number is yours, held for ten minutes. Everyone sees it go, on the drop’s page, as it happens.',
      },
      {
        title: 'Pay before the time runs out',
        text: 'Paid, it is printed, numbered in pencil and rolled in a tube. Not paid, it goes back to the edition for the next person.',
      },
    ],
    rulesTitle: 'The rules behind it',
    rules: [
      {
        title: 'Never fifty-one',
        text: 'The numbers live in a database that hands each one out once, in a single step, even to a thousand people in the same second. The shop’s stock counts them a second time.',
      },
      {
        title: 'One per person',
        text: 'A passkey stands for one person, and the database refuses a second copy to the same one, held or paid.',
      },
      {
        title: 'Ten minutes, and no longer',
        text: 'The clock on a held copy is the database’s, not your browser’s. When it runs out the copy is open again, whether or not anyone is looking.',
      },
      {
        title: 'A test payment',
        text: 'Deckle is a portfolio project: the order is real and lands in the shop’s dashboard, and the payment settles at once with no money moving.',
      },
    ],
    see: 'See the drops',
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
