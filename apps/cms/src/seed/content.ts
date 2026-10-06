/**
 * The editorial content every fresh stack starts with. The stories' facts were
 * checked against their sources: change a word only with a source for it. The
 * shorter stories say only what The Met's own record of the work says.
 */

export interface StorySeed {
  readonly artworkSlug: string;
  readonly title: string;
  readonly lede: string;
  readonly paragraphs: readonly string[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
}

export interface CurationSeed {
  readonly title: string;
  readonly slug: string;
  /** A few plain sentences that open the curation, or null for none. */
  readonly intro: string | null;
  readonly artworks: readonly string[];
}

export interface DropPageSeed {
  readonly slug: string;
  readonly artworkSlug: string;
  readonly headline: string;
  readonly paragraphs: readonly string[];
}

const met = (label: string, objectId: number) => ({
  label: `The Met, ${label}`,
  url: `https://www.metmuseum.org/art/collection/search/${String(objectId)}`,
});

export const curationSeeds: readonly CurationSeed[] = [
  {
    title: 'First impressions',
    slug: 'first-impressions',
    intro: null,
    artworks: [
      'melencolia-i',
      'the-rhinoceros',
      'knight-death-and-the-devil',
      'the-sleep-of-reason-produces-monsters',
      'under-the-wave-off-kanagawa',
    ],
  },
  {
    title: 'Thirty-six Views of Mount Fuji',
    slug: 'thirty-six-views-of-mount-fuji',
    intro: 'Four of the views Hokusai designed for his series, the Great Wave among them.',
    artworks: [
      'under-the-wave-off-kanagawa',
      'south-wind-clear-sky',
      'storm-below-mount-fuji',
      'ejiri-in-suruga-province',
    ],
  },
  {
    title: 'Dürer in copper and wood',
    slug: 'durer-in-copper-and-wood',
    intro: 'Three engravings from 1513 and 1514, and the woodcut of a rhinoceros Dürer never saw.',
    artworks: [
      'knight-death-and-the-devil',
      'melencolia-i',
      'saint-jerome-in-his-study',
      'the-rhinoceros',
    ],
  },
  {
    title: 'Rain, snow and fireworks',
    slug: 'rain-snow-and-fireworks',
    intro:
      'Weather and fireworks in Japanese woodblock prints, from Hiroshige in the 1830s and 1850s to Kiyochika in 1881.',
    artworks: [
      'evening-snow-at-kanbara',
      'sudden-shower-over-shin-ohashi',
      'fireworks-at-ryogoku-bridge',
      'fireworks-at-ikenohata',
    ],
  },
  {
    title: 'Monsters and dreams',
    slug: 'monsters-and-dreams',
    intro:
      'Demons, witches, a giant and the monsters of sleep, from Schongauer in the 1470s to Redon in 1890.',
    artworks: [
      'saint-anthony-tormented-by-demons',
      'the-witches',
      'the-sleep-of-reason-produces-monsters',
      'seated-giant',
      'eyes-closed',
    ],
  },
];

/**
 * The words on two numbered drops. The drops themselves, their dates, sizes and
 * prices, belong to the gateway; the resolution is the one the print-sizes
 * package gives each scan at A3.
 */
export const dropPageSeeds: readonly DropPageSeed[] = [
  {
    slug: 'melencolia-i-numbered',
    artworkSlug: 'melencolia-i',
    headline: 'Melencolia I, in fifty numbered copies',
    paragraphs: [
      'Each copy is A3, printed from The Met’s scan at 302 ppi and numbered in pencil, from 1/50 to 50/50. Claim one and it is held for you for ten minutes while you pay.',
    ],
  },
  {
    slug: 'the-great-wave-numbered',
    artworkSlug: 'under-the-wave-off-kanagawa',
    headline: 'The Great Wave, in fifty numbered copies',
    paragraphs: [
      'Each copy is A3, printed from The Met’s scan at 278 ppi and numbered in pencil, from 1/50 to 50/50. Claim one and it is held for you for ten minutes while you pay.',
    ],
  },
];

export const storySeeds: readonly StorySeed[] = [
  {
    artworkSlug: 'melencolia-i',
    title: 'About the engraving',
    lede: 'Dürer cut Melencolia I into copper in 1514, a year after Knight, Death, and the Devil. With Saint Jerome in His Study, the three are known as his master engravings.',
    paragraphs: [
      'A winged figure sits idle among the tools of measuring and making, a compass slack in her hand. Above her hang an hourglass, a scale and a bell, beside a magic square in which every row, column and diagonal adds up to 34. Its bottom row gives the year: 15 14.',
    ],
    sources: [met('Melencolia I', 336228)],
  },
  {
    artworkSlug: 'the-rhinoceros',
    title: 'About the woodcut',
    lede: 'Dürer never saw the animal he drew. An Indian rhinoceros reached Lisbon in 1515, the first living one seen in Europe since Roman times, and he worked from a written description and a sketch sent on to Nuremberg.',
    paragraphs: [
      'He gave it armour plates, scales on its legs and a small twisted horn on its back, none of which the animal had. The block was printed again and again after his death, and for more than two hundred years the woodcut was how most Europeans pictured a rhinoceros.',
    ],
    sources: [met('The Rhinoceros', 356497)],
  },
  {
    artworkSlug: 'under-the-wave-off-kanagawa',
    title: 'About the print',
    lede: 'Hokusai made the Great Wave around 1830–32 for his series Thirty-six Views of Mount Fuji. The mountain sits small in the distance, framed by the trough of the wave.',
    paragraphs: [
      'Its deep blue is Prussian blue, a synthetic pigment then newly arrived in Japan. Thousands of impressions were printed from the carved blocks, and those that survive differ in colour and wear.',
    ],
    sources: [met('Under the Wave off Kanagawa', 45434)],
  },
  {
    artworkSlug: 'south-wind-clear-sky',
    title: 'About the print',
    lede: 'Hokusai designed South Wind, Clear Sky, also known as Red Fuji, around 1830–32 for his series Thirty-six Views of Mount Fuji.',
    paragraphs: [
      'It is a woodblock print in ink and colour on paper, 25.4 by 38.1 centimetres. The Met’s impression came with the Howard Mansfield Collection, bought with the Rogers Fund in 1936.',
    ],
    sources: [met('South Wind, Clear Sky', 57007)],
  },
  {
    artworkSlug: 'storm-below-mount-fuji',
    title: 'About the print',
    lede: 'Storm below Mount Fuji is another of the views Hokusai designed around 1830–32 for Thirty-six Views of Mount Fuji.',
    paragraphs: [
      'A woodblock print in ink and colour on paper, 25.4 by 37.5 centimetres. The Met’s impression came with the Henry L. Phillips Collection, a bequest of Henry L. Phillips in 1939.',
    ],
    sources: [met('Storm below Mount Fuji', 56229)],
  },
  {
    artworkSlug: 'ejiri-in-suruga-province',
    title: 'About the print',
    lede: 'Ejiri in Suruga Province belongs to the same series, Thirty-six Views of Mount Fuji, which Hokusai designed around 1830–32.',
    paragraphs: [
      'The subjects The Met lists for it are a landscape and figures at work. It is a woodblock print in ink and colour on paper, 25.4 by 37.1 centimetres, bought with the Rogers Fund in 1914.',
    ],
    sources: [met('Ejiri in Suruga Province', 36493)],
  },
  {
    artworkSlug: 'knight-death-and-the-devil',
    title: 'About the engraving',
    lede: 'Dürer engraved Knight, Death, and the Devil in 1513, the year before Melencolia I.',
    paragraphs: [
      'The plate measures 24.3 by 18.8 centimetres. The subjects The Met lists for it include a knight, a horse, a dog, a skull and the Devil. It was bought with the Harris Brisbane Dick Fund in 1943.',
    ],
    sources: [met('Knight, Death, and the Devil', 336223)],
  },
  {
    artworkSlug: 'saint-jerome-in-his-study',
    title: 'About the engraving',
    lede: 'Saint Jerome in His Study is dated 1514, the year of Melencolia I.',
    paragraphs: [
      'An engraving on a sheet 34.5 by 18.8 centimetres. The subjects The Met lists for it include an interior, a lion and a skull. It came with the George Khuner Collection, a gift of Mrs. George Khuner in 1968.',
    ],
    sources: [met('Saint Jerome in His Study', 391257)],
  },
  {
    artworkSlug: 'evening-snow-at-kanbara',
    title: 'About the print',
    lede: 'Hiroshige made Evening Snow at Kanbara around 1833–34 for his series Fifty-three Stations of the Tōkaidō.',
    paragraphs: [
      'A woodblock print in ink and colour on paper, 22.5 by 34.9 centimetres. The subjects The Met lists for it are snow, houses and mountains. It came with the Howard Mansfield Collection, bought with the Rogers Fund in 1936.',
    ],
    sources: [met('Evening Snow at Kanbara', 56915)],
  },
  {
    artworkSlug: 'sudden-shower-over-shin-ohashi',
    title: 'About the print',
    lede: 'Sudden Shower over Shin-Ōhashi Bridge and Atake is dated 1857, one of Hiroshige’s One Hundred Famous Views of Edo.',
    paragraphs: [
      'A woodblock print in ink and colour on paper, 36.5 by 24.3 centimetres. The subjects The Met lists for it are rain, a bridge, boats and figures. It was bought with the Joseph Pulitzer Bequest in 1918.',
    ],
    sources: [met('Sudden Shower over Shin-Ōhashi Bridge and Atake', 37094)],
  },
  {
    artworkSlug: 'fireworks-at-ryogoku-bridge',
    title: 'About the print',
    lede: 'Hiroshige’s Fireworks at Ryōgoku Bridge is dated 1858, from the same series, One Hundred Famous Views of Edo.',
    paragraphs: [
      'A woodblock print in ink and colour on paper, its image 33.7 by 22.2 centimetres. The subjects The Met lists for it are a bridge, fireworks and boats. It was bought with the Joseph Pulitzer Bequest in 1918.',
    ],
    sources: [met('Fireworks at Ryōgoku Bridge', 37093)],
  },
  {
    artworkSlug: 'fireworks-at-ikenohata',
    title: 'About the print',
    lede: 'Kobayashi Kiyochika, who lived from 1847 to 1915, made Fireworks at Ikenohata in 1881, the fourteenth year of the Meiji era.',
    paragraphs: [
      'A woodblock print in ink and colour on paper, its image 20.3 by 31.4 centimetres. The subjects The Met lists for it are fireworks and lanterns. It was a gift of Sebastian and Miki Izzard in 2016.',
    ],
    sources: [met('Fireworks at Ikenohata', 712976)],
  },
];
