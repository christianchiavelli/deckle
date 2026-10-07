/** A rectangle of an original, in its pixels, measured with the image upright. */
export interface Crop {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A work Deckle sells: The Met's object, and what the shop adds to it. */
export interface CuratedWork {
  readonly objectId: number;
  /** Short and readable, unique, and stable once published: URLs and seeds key on it. */
  readonly slug: string;
  /** The Met's title, shortened by hand only where it runs to a sentence or carries its series. */
  readonly shortTitle: string;
  /**
   * The part of the original that is the print, where The Met photographed it
   * beside a grey scale: the shop sells the print, not the museum's target.
   * The master and the print sizes come from this part alone.
   */
  readonly crop?: Crop;
}

/**
 * The works Deckle sells, in the order the shop lists them.
 *
 * Chosen on 5 October 2026 from searches of `/v1.1/search` (`hasImages=true`,
 * by artist with `artistOrCulture=true` or by title with `title=true`, in
 * Drawings and Prints and in Asian Art), run through
 * `pnpm --filter @deckle/met candidates`, which reads each object and the
 * pixel size of its original from the image's header. Of the 559 objects
 * read, 434 were public domain with an image; a work made the list when:
 *
 * - The Met flags it public domain. Nothing else counts: not one of the 87
 *   Drawings and Prints objects found for Mary Cassatt comes with a
 *   public-domain image, so she is not here, while Berthe Morisot is.
 * - It is a print, made between 1450 and 1920, by a named artist with a firm
 *   attribution (no "After" or "Attributed to"; the importer refuses those).
 * - It is one impression of its print: where The Met has several, usually
 *   the one with the largest original.
 * - Its original prints at A4 or larger at 240 ppi. None of the 434 originals
 *   passed 4,000 px on its long edge, so no work reaches A1 (which needs at
 *   least 4,668); the list keeps a few that stop at A4 and the near-square
 *   ones that reach A2, so the shop shows that sizes follow the scan.
 * - It is not gratuitously violent, and the list as a whole spreads across
 *   engraving, woodcut and chiaroscuro woodcut, etching, drypoint, aquatint,
 *   mezzotint, stipple, lithograph and the Japanese woodblock print, with the
 *   women printmakers whose public-domain prints The Met holds: Diana
 *   Scultori, Geertruydt Roghman, Fanny Palmer and Berthe Morisot.
 *
 * The first five are the works every service was first seeded with; their
 * slugs are published and must not change.
 */
export const curation: readonly CuratedWork[] = [
  { objectId: 336228, slug: 'melencolia-i', shortTitle: 'Melencolia I' },
  { objectId: 356497, slug: 'the-rhinoceros', shortTitle: 'The Rhinoceros' },
  {
    objectId: 336223,
    slug: 'knight-death-and-the-devil',
    shortTitle: 'Knight, Death, and the Devil',
  },
  {
    objectId: 338473,
    slug: 'the-sleep-of-reason-produces-monsters',
    shortTitle: 'The Sleep of Reason Produces Monsters',
  },
  {
    objectId: 45434,
    slug: 'under-the-wave-off-kanagawa',
    shortTitle: 'Under the Wave off Kanagawa',
  },

  // Engraving and woodcut, 1470 to 1650
  {
    objectId: 336142,
    slug: 'saint-anthony-tormented-by-demons',
    shortTitle: 'Saint Anthony Tormented by Demons',
  },
  {
    objectId: 336194,
    slug: 'shield-with-greyhound',
    shortTitle: 'Shield with Greyhound Held by Wild Man',
  },
  { objectId: 336141, slug: 'the-elephant', shortTitle: 'The Elephant' },
  { objectId: 391257, slug: 'saint-jerome-in-his-study', shortTitle: 'Saint Jerome in His Study' },
  { objectId: 364693, slug: 'the-milkmaid', shortTitle: 'The Milkmaid' },
  { objectId: 336235, slug: 'the-witches', shortTitle: 'The Witches' },
  { objectId: 354611, slug: 'diogenes', shortTitle: 'Diogenes' },
  { objectId: 632135, slug: 'the-colossus-of-rhodes', shortTitle: 'The Colossus of Rhodes' },
  {
    objectId: 383482,
    slug: 'horatio-cocles',
    shortTitle: 'Horatio Coclès Saving Himself by Swimming',
  },
  {
    objectId: 336753,
    slug: 'lucretia-and-her-women-spinning',
    shortTitle: 'Lucretia and Her Women Spinning',
  },
  {
    objectId: 338919,
    slug: 'the-feast-of-the-gods',
    shortTitle: 'The Feast of the Gods at the Marriage of Cupid and Psyche',
  },
  { objectId: 387971, slug: 'a-woman-spinning', shortTitle: 'A Woman Spinning' },

  // Etching, mezzotint, aquatint and stipple, 1639 to 1826
  {
    objectId: 368058,
    slug: 'self-portrait-leaning-on-a-stone-sill',
    shortTitle: 'Self-Portrait Leaning on a Stone Sill',
  },
  { objectId: 354633, slug: 'the-three-trees', shortTitle: 'The Three Trees' },
  { objectId: 392608, slug: 'the-laughing-audience', shortTitle: 'The Laughing Audience' },
  {
    objectId: 335285,
    slug: 'portico-with-an-open-lantern',
    shortTitle: 'A Three-Arched Portico with an Open Lantern',
  },
  { objectId: 337060, slug: 'the-drawbridge', shortTitle: 'The Drawbridge' },
  { objectId: 338658, slug: 'girl-and-pigs', shortTitle: 'Girl and Pigs' },
  {
    objectId: 395106,
    slug: 'the-blue-egyptian-water-lily',
    shortTitle: 'The Blue Egyptian Water Lily',
  },
  { objectId: 382947, slug: 'calm', shortTitle: 'Calm' },
  { objectId: 334002, slug: 'seated-giant', shortTitle: 'Seated Giant' },
  { objectId: 373640, slug: 'belshazzars-feast', shortTitle: "Belshazzar's Feast (First Plate)" },

  // Lithograph, etching and drypoint, 1857 to 1899
  { objectId: 415909, slug: 'mill-river-scenery', shortTitle: 'Mill River Scenery' },
  { objectId: 372701, slug: 'black-lion-wharf', shortTitle: 'Black Lion Wharf' },
  {
    objectId: 337823,
    slug: 'the-drama-of-the-sea-brittany',
    shortTitle: 'The Drama of the Sea, Brittany',
  },
  {
    objectId: 336670,
    slug: 'the-drawing-lesson',
    shortTitle: 'The Drawing Lesson (Berthe Morisot and her Daughter)',
  },
  { objectId: 356778, slug: 'eyes-closed', shortTitle: 'Eyes Closed' },
  { objectId: 333848, slug: 'at-the-curtain', shortTitle: 'At the Curtain' },
  { objectId: 333898, slug: 'the-jockey', shortTitle: 'The Jockey' },

  // The Japanese woodblock print, 1766 to 1881
  {
    objectId: 36633,
    slug: 'two-young-women-on-a-verandah',
    shortTitle: 'Two Young Women on a Verandah',
    // The scan runs on past the sheet's right edge (x 2,966) to a grey scale
    // from x 3,028. The cut leaves as much backdrop on the right as on the left.
    crop: { left: 70, top: 0, width: 2950, height: 4000 },
  },
  { objectId: 36636, slug: 'a-girl-as-a-komuso', shortTitle: 'A Girl as a Komuso' },
  {
    objectId: 36607,
    slug: 'merrymakers-at-shinagawa',
    shortTitle: 'A Party of Merrymakers in a Tea-house at Shinagawa',
  },
  {
    objectId: 36673,
    slug: 'ichikawa-omezo-i-as-yakko-ippei',
    shortTitle: 'Ichikawa Omezō I in the Role of Yakko Ippei',
  },
  {
    objectId: 36624,
    slug: 'takashima-ohisa',
    shortTitle: 'Takashima Ohisa Using Two Mirrors to Observe Her Coiffure',
  },
  { objectId: 57007, slug: 'south-wind-clear-sky', shortTitle: 'South Wind, Clear Sky' },
  { objectId: 56229, slug: 'storm-below-mount-fuji', shortTitle: 'Storm below Mount Fuji' },
  { objectId: 36493, slug: 'ejiri-in-suruga-province', shortTitle: 'Ejiri in Suruga Province' },
  {
    objectId: 56139,
    slug: 'kirifuri-waterfall',
    shortTitle: 'Kirifuri Waterfall at Kurokami Mountain in Shimotsuke',
  },
  { objectId: 56915, slug: 'evening-snow-at-kanbara', shortTitle: 'Evening Snow at Kanbara' },
  {
    objectId: 37094,
    slug: 'sudden-shower-over-shin-ohashi',
    shortTitle: 'Sudden Shower over Shin-Ōhashi Bridge and Atake',
  },
  {
    objectId: 37093,
    slug: 'fireworks-at-ryogoku-bridge',
    shortTitle: 'Fireworks at Ryōgoku Bridge',
  },
  {
    objectId: 73613,
    slug: 'six-poetic-sages-at-kameido',
    shortTitle: 'Six Poetic Sages as Young Women at the Plum Garden at Kameido',
  },
  { objectId: 712976, slug: 'fireworks-at-ikenohata', shortTitle: 'Fireworks at Ikenohata' },
];
