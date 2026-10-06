/**
 * The editorial content every fresh stack starts with. The stories' facts were
 * checked against their sources: change a word only with a source for it.
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
  readonly artworks: readonly string[];
}

export const firstImpressions: CurationSeed = {
  title: 'First impressions',
  slug: 'first-impressions',
  artworks: [
    'melencolia-i',
    'the-rhinoceros',
    'knight-death-and-the-devil',
    'the-sleep-of-reason-produces-monsters',
    'under-the-wave-off-kanagawa',
  ],
};

export const storySeeds: readonly StorySeed[] = [
  {
    artworkSlug: 'melencolia-i',
    title: 'About the engraving',
    lede: 'Dürer cut Melencolia I into copper in 1514, a year after Knight, Death, and the Devil. With Saint Jerome in His Study, the three are known as his master engravings.',
    paragraphs: [
      'A winged figure sits idle among the tools of measuring and making, a compass slack in her hand. Above her hang an hourglass, a scale and a bell, beside a magic square in which every row, column and diagonal adds up to 34. Its bottom row gives the year: 15 14.',
    ],
    sources: [
      {
        label: 'The Met, Melencolia I',
        url: 'https://www.metmuseum.org/art/collection/search/336228',
      },
    ],
  },
  {
    artworkSlug: 'the-rhinoceros',
    title: 'About the woodcut',
    lede: 'Dürer never saw the animal he drew. An Indian rhinoceros reached Lisbon in 1515, the first living one seen in Europe since Roman times, and he worked from a written description and a sketch sent on to Nuremberg.',
    paragraphs: [
      'He gave it armour plates, scales on its legs and a small twisted horn on its back, none of which the animal had. The block was printed again and again after his death, and for more than two hundred years the woodcut was how most Europeans pictured a rhinoceros.',
    ],
    sources: [
      {
        label: 'The Met, The Rhinoceros',
        url: 'https://www.metmuseum.org/art/collection/search/356497',
      },
    ],
  },
  {
    artworkSlug: 'under-the-wave-off-kanagawa',
    title: 'About the print',
    lede: 'Hokusai made the Great Wave around 1830–32 for his series Thirty-six Views of Mount Fuji. The mountain sits small in the distance, framed by the trough of the wave.',
    paragraphs: [
      'Its deep blue is Prussian blue, a synthetic pigment then newly arrived in Japan. Thousands of impressions were printed from the carved blocks, and those that survive differ in colour and wear.',
    ],
    sources: [
      {
        label: 'The Met, Under the Wave off Kanagawa',
        url: 'https://www.metmuseum.org/art/collection/search/45434',
      },
    ],
  },
];
