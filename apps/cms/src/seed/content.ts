/**
 * The editorial content every fresh stack starts with, in English and in
 * Brazilian Portuguese, the store's two editions. The stories' facts were
 * checked against their sources: change a word only with a source for it, and
 * in both languages. The shorter stories say only what The Met's own record of
 * the work says. The Portuguese gives a work the title it is known by in
 * Portuguese where it has one; the store's pages keep the museum's.
 */

export interface StorySeed {
  readonly artworkSlug: string;
  readonly title: string;
  readonly lede: string;
  /** What the story's card shows up close, in percent of the print, and how close. */
  readonly detail: { readonly x: number; readonly y: number; readonly zoom: number };
  /** The same detail beside the story on the work’s page: what it shows, and the line under it. */
  readonly figure: StoryFigureSeed;
  readonly paragraphs: readonly string[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  /** The same story in Portuguese: the same facts, the same paragraphs. */
  readonly pt: {
    readonly title: string;
    readonly lede: string;
    readonly figure: StoryFigureSeed;
    readonly paragraphs: readonly string[];
  };
}

export interface StoryFigureSeed {
  /** The detail in a sentence, for whoever cannot see it. */
  readonly alt: string;
  readonly caption: string;
}

export interface CurationSeed {
  readonly title: string;
  readonly slug: string;
  /** A few plain sentences that open the curation, or null for none. */
  readonly intro: string | null;
  readonly artworks: readonly string[];
  readonly pt: { readonly title: string; readonly intro: string | null };
}

export interface DropPageSeed {
  readonly slug: string;
  readonly artworkSlug: string;
  readonly headline: string;
  readonly paragraphs: readonly string[];
  readonly pt: { readonly headline: string; readonly paragraphs: readonly string[] };
}

const met = (label: string, objectId: number) => ({
  label: `The Met, ${label}`,
  url: `https://www.metmuseum.org/art/collection/search/${String(objectId)}`,
});

export const curationSeeds: readonly CurationSeed[] = [
  {
    // The store's front page lists these under "The prints": eight makers, two
    // full rows, none of them the works the page already shows elsewhere.
    title: 'First impressions',
    slug: 'first-impressions',
    intro: null,
    artworks: [
      'the-rhinoceros',
      'the-three-trees',
      'south-wind-clear-sky',
      'the-drawbridge',
      'evening-snow-at-kanbara',
      'the-sleep-of-reason-produces-monsters',
      'black-lion-wharf',
      'two-young-women-on-a-verandah',
    ],
    pt: { title: 'Primeiras impressões', intro: null },
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
    pt: {
      title: 'Trinta e seis vistas do monte Fuji',
      intro: 'Quatro das vistas que Hokusai desenhou para sua série, a Grande Onda entre elas.',
    },
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
    pt: {
      title: 'Dürer no cobre e na madeira',
      intro:
        'Três gravuras a buril de 1513 e 1514, e a xilogravura de um rinoceronte que Dürer nunca viu.',
    },
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
    pt: {
      title: 'Chuva, neve e fogos',
      intro:
        'O tempo e os fogos de artifício em xilogravuras japonesas, de Hiroshige nas décadas de 1830 e 1850 a Kiyochika em 1881.',
    },
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
    pt: {
      title: 'Monstros e sonhos',
      intro:
        'Demônios, bruxas, um gigante e os monstros do sono, de Schongauer na década de 1470 a Redon em 1890.',
    },
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
    pt: {
      headline: 'Melencolia I, em cinquenta exemplares numerados',
      paragraphs: [
        'Cada exemplar é A3, impresso a partir da digitalização do Met a 302 ppi e numerado a lápis, de 1/50 a 50/50. Garanta o seu e ele fica reservado para você por dez minutos enquanto você paga.',
      ],
    },
  },
  {
    slug: 'the-great-wave-numbered',
    artworkSlug: 'under-the-wave-off-kanagawa',
    headline: 'The Great Wave, in fifty numbered copies',
    paragraphs: [
      'Each copy is A3, printed from The Met’s scan at 278 ppi and numbered in pencil, from 1/50 to 50/50. Claim one and it is held for you for ten minutes while you pay.',
    ],
    pt: {
      headline: 'A Grande Onda, em cinquenta exemplares numerados',
      paragraphs: [
        'Cada exemplar é A3, impresso a partir da digitalização do Met a 278 ppi e numerado a lápis, de 1/50 a 50/50. Garanta o seu e ele fica reservado para você por dez minutos enquanto você paga.',
      ],
    },
  },
];

/** In the journal's order, newest first: the seed creates them last to first. */
export const storySeeds: readonly StorySeed[] = [
  {
    artworkSlug: 'melencolia-i',
    title: 'About the engraving',
    lede: 'Dürer cut Melencolia I into copper in 1514, a year after Knight, Death, and the Devil. With Saint Jerome in His Study, the three are known as his master engravings.',
    detail: { x: 74, y: 22, zoom: 3 },
    figure: {
      alt: 'The magic square set into the wall, its bottom row reading 4, 15, 14, 1, with the bell above it and the hourglass to its left.',
      caption: 'The magic square: every row, column and diagonal adds up to 34',
    },
    paragraphs: [
      'A winged figure sits idle among the tools of measuring and making, a compass slack in her hand. Above her hang an hourglass, a scale and a bell, beside a magic square in which every row, column and diagonal adds up to 34. Its bottom row gives the year: 15\u00a014.',
    ],
    sources: [met('Melencolia I', 336228)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Dürer gravou Melencolia I no cobre em 1514, um ano depois de O Cavaleiro, a Morte e o Diabo. Com São Jerônimo em seu gabinete, as três são conhecidas como suas gravuras-mestras.',
      figure: {
        alt: 'O quadrado mágico na parede, com a linha de baixo lendo 4, 15, 14, 1, o sino acima e a ampulheta à esquerda.',
        caption: 'O quadrado mágico: cada linha, coluna e diagonal soma 34',
      },
      paragraphs: [
        'Uma figura alada está sentada, parada, entre os instrumentos de medir e de construir, com um compasso frouxo na mão. Acima dela pendem uma ampulheta, uma balança e um sino, ao lado de um quadrado mágico em que cada linha, coluna e diagonal soma 34. A linha de baixo dá o ano: 15\u00a014.',
      ],
    },
  },
  {
    artworkSlug: 'the-rhinoceros',
    title: 'About the woodcut',
    lede: 'Dürer never saw the animal he drew. An Indian rhinoceros reached Lisbon in 1515, the first living one seen in Europe since Roman times, and he worked from a written description and a sketch sent on to Nuremberg.',
    detail: { x: 84, y: 52, zoom: 2.2 },
    figure: {
      alt: 'The rhinoceros’s head, with its eye, its ear and the horn on its snout, beside a shoulder plate Dürer covered in rings like armour.',
      caption: 'The armour plates Dürer gave it, which the real animal never had',
    },
    paragraphs: [
      'He gave it armour plates, scales on its legs and a small twisted horn on its back, none of which the animal had. The block was printed again and again after his death, and for more than two hundred years the woodcut was how most Europeans pictured a rhinoceros.',
    ],
    sources: [met('The Rhinoceros', 356497)],
    pt: {
      title: 'Sobre a xilogravura',
      lede: 'Dürer nunca viu o animal que desenhou. Um rinoceronte indiano chegou a Lisboa em 1515, o primeiro vivo visto na Europa desde os tempos romanos, e ele trabalhou a partir de uma descrição escrita e de um esboço enviados a Nuremberg.',
      figure: {
        alt: 'A cabeça do rinoceronte, com o olho, a orelha e o chifre do focinho, ao lado de uma placa do ombro que Dürer cobriu de anéis, como uma armadura.',
        caption: 'As placas de armadura que Dürer lhe deu e que o animal de verdade nunca teve',
      },
      paragraphs: [
        'Ele lhe deu placas de armadura, escamas nas pernas e um pequeno chifre torcido nas costas, nada disso existia no animal. O bloco foi impresso muitas e muitas vezes depois da morte dele, e por mais de duzentos anos foi por essa xilogravura que a maioria dos europeus imaginou um rinoceronte.',
      ],
    },
  },
  {
    artworkSlug: 'under-the-wave-off-kanagawa',
    title: 'About the print',
    lede: 'Hokusai made the Great Wave around 1830–32 for his series Thirty-six Views of Mount Fuji. The mountain sits small in the distance, framed by the trough of the wave.',
    detail: { x: 30, y: 30, zoom: 1.6 },
    figure: {
      alt: 'The crest of the great wave breaking into claws of foam, beside the cartouche that gives the series and the print’s title in Japanese.',
      caption:
        'The wave’s deep blue is Prussian blue, a synthetic pigment then newly arrived in Japan',
    },
    paragraphs: [
      'Its deep blue is Prussian blue, a synthetic pigment then newly arrived in Japan. Thousands of impressions were printed from the carved blocks, and those that survive differ in colour and wear.',
    ],
    sources: [met('Under the Wave off Kanagawa', 45434)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Hokusai fez a Grande Onda por volta de 1830–32 para sua série Trinta e seis vistas do monte Fuji. A montanha aparece pequena ao longe, emoldurada pela concavidade da onda.',
      figure: {
        alt: 'A crista da grande onda se desfazendo em garras de espuma, ao lado do cartucho com o nome da série e o título da gravura em japonês.',
        caption:
          'O azul profundo da onda é o azul da Prússia, um pigmento sintético que acabava de chegar ao Japão',
      },
      paragraphs: [
        'Seu azul profundo é o azul da Prússia, um pigmento sintético que acabava de chegar ao Japão. Milhares de impressões saíram dos blocos entalhados, e as que sobrevivem diferem na cor e no desgaste.',
      ],
    },
  },
  {
    artworkSlug: 'south-wind-clear-sky',
    title: 'About the print',
    lede: 'Hokusai designed South Wind, Clear Sky, also known as Red Fuji, around 1830–32 for his series Thirty-six Views of Mount Fuji.',
    detail: { x: 55, y: 45, zoom: 1.8 },
    figure: {
      alt: 'The red slope and snow-streaked peak of Mount Fuji against rows of small white clouds in a blue sky.',
      caption: 'Red Fuji, as the print is also known',
    },
    paragraphs: [
      'It is a woodblock print in ink and colour on paper, 25.4 by 38.1 centimetres. The Met’s impression came with the Howard Mansfield Collection, bought with the Rogers Fund in 1936.',
    ],
    sources: [met('South Wind, Clear Sky', 57007)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Hokusai desenhou Vento sul, céu claro, também conhecida como Fuji Vermelho, por volta de 1830–32 para sua série Trinta e seis vistas do monte Fuji.',
      figure: {
        alt: 'A encosta vermelha e o cume riscado de neve do monte Fuji, contra fileiras de pequenas nuvens brancas num céu azul.',
        caption: 'Fuji Vermelho, como a gravura também é conhecida',
      },
      paragraphs: [
        'É uma xilogravura em tinta e cor sobre papel, de 25,4 por 38,1 centímetros. A impressão do Met veio com a Howard Mansfield Collection, comprada com o Rogers Fund em 1936.',
      ],
    },
  },
  {
    artworkSlug: 'storm-below-mount-fuji',
    title: 'About the print',
    lede: 'Storm below Mount Fuji is another of the views Hokusai designed around 1830–32 for Thirty-six Views of Mount Fuji.',
    detail: { x: 45, y: 40, zoom: 1.8 },
    figure: {
      alt: 'The flank of Mount Fuji in dense red and brown dots, streaked with snow towards the summit, above a bank of white cloud.',
      caption: 'The summit stays clear; the storm of the title strikes lower down the mountain',
    },
    paragraphs: [
      'A woodblock print in ink and colour on paper, 25.4 by 37.5 centimetres. The Met’s impression came with the Henry L. Phillips Collection, a bequest of Henry L. Phillips in 1939.',
    ],
    sources: [met('Storm below Mount Fuji', 56229)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Tempestade abaixo do monte Fuji é outra das vistas que Hokusai desenhou por volta de 1830–32 para Trinta e seis vistas do monte Fuji.',
      figure: {
        alt: 'A encosta do monte Fuji em pontos densos de vermelho e marrom, riscada de neve perto do cume, acima de uma faixa de nuvens brancas.',
        caption: 'O cume fica limpo; a tempestade do título cai mais abaixo na montanha',
      },
      paragraphs: [
        'Uma xilogravura em tinta e cor sobre papel, de 25,4 por 37,5 centímetros. A impressão do Met veio com a Henry L. Phillips Collection, deixada em testamento por Henry L. Phillips em 1939.',
      ],
    },
  },
  {
    artworkSlug: 'ejiri-in-suruga-province',
    title: 'About the print',
    lede: 'Ejiri in Suruga Province belongs to the same series, Thirty-six Views of Mount Fuji, which Hokusai designed around 1830–32.',
    detail: { x: 30, y: 35, zoom: 1.8 },
    figure: {
      alt: 'Mount Fuji drawn as one faint line behind two trees bent by the wind, with papers blowing across the field and figures bent against the wind.',
      caption: 'The mountain is a single thin line, behind trees bent by the wind',
    },
    paragraphs: [
      'The subjects The Met lists for it are a landscape and figures at work. It is a woodblock print in ink and colour on paper, 25.4 by 37.1 centimetres, bought with the Rogers Fund in 1914.',
    ],
    sources: [met('Ejiri in Suruga Province', 36493)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Ejiri, na província de Suruga, pertence à mesma série, Trinta e seis vistas do monte Fuji, que Hokusai desenhou por volta de 1830–32.',
      figure: {
        alt: 'O monte Fuji desenhado com uma única linha fina atrás de duas árvores dobradas pelo vento, com papéis voando pelo campo e figuras curvadas contra o vento.',
        caption: 'A montanha é uma única linha fina, atrás de árvores dobradas pelo vento',
      },
      paragraphs: [
        'Os temas que o Met lista para ela são uma paisagem e figuras trabalhando. É uma xilogravura em tinta e cor sobre papel, de 25,4 por 37,1 centímetros, comprada com o Rogers Fund em 1914.',
      ],
    },
  },
  {
    artworkSlug: 'knight-death-and-the-devil',
    title: 'About the engraving',
    lede: 'Dürer engraved Knight, Death, and the Devil in 1513, the year before Melencolia I.',
    detail: { x: 50, y: 40, zoom: 2.4 },
    figure: {
      alt: 'Death, a bearded figure wound with snakes, at the shoulder of the knight, whose armoured arm and leg and the sword at his side fill the rest of the frame.',
      caption: 'Death, wound with snakes, rides at the knight’s side',
    },
    paragraphs: [
      'The plate measures 24.3 by 18.8 centimetres. The subjects The Met lists for it include a knight, a horse, a dog, a skull and the Devil. It was bought with the Harris Brisbane Dick Fund in 1943.',
    ],
    sources: [met('Knight, Death, and the Devil', 336223)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Dürer gravou O Cavaleiro, a Morte e o Diabo em 1513, um ano antes de Melencolia I.',
      figure: {
        alt: 'A Morte, uma figura barbada enrolada em cobras, junto ao ombro do cavaleiro, cujo braço e perna de armadura e a espada na cintura ocupam o resto do quadro.',
        caption: 'A Morte, enrolada em cobras, cavalga ao lado do cavaleiro',
      },
      paragraphs: [
        'A chapa mede 24,3 por 18,8 centímetros. Entre os temas que o Met lista para ela estão um cavaleiro, um cavalo, um cão, uma caveira e o Diabo. Foi comprada com o Harris Brisbane Dick Fund em 1943.',
      ],
    },
  },
  {
    artworkSlug: 'saint-jerome-in-his-study',
    title: 'About the engraving',
    lede: 'Saint Jerome in His Study is dated 1514, the year of Melencolia I.',
    detail: { x: 70, y: 45, zoom: 2.4 },
    figure: {
      alt: 'Saint Jerome bent over his writing at a small desk, rays of light around his head, under an hourglass and a broad hat hung on the wall.',
      caption: 'Jerome at his desk, under the hourglass on the wall',
    },
    paragraphs: [
      'An engraving on a sheet 34.5 by 18.8 centimetres. The subjects The Met lists for it include an interior, a lion and a skull. It came with the George Khuner Collection, a gift of Mrs. George Khuner in 1968.',
    ],
    sources: [met('Saint Jerome in His Study', 391257)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'São Jerônimo em seu gabinete é datada de 1514, o ano de Melencolia I.',
      figure: {
        alt: 'São Jerônimo curvado sobre a escrita numa mesinha, com raios de luz em volta da cabeça, sob uma ampulheta e um chapéu largo pendurados na parede.',
        caption: 'Jerônimo à mesa, sob a ampulheta na parede',
      },
      paragraphs: [
        'Uma gravura a buril numa folha de 34,5 por 18,8 centímetros. Entre os temas que o Met lista para ela estão um interior, um leão e uma caveira. Veio com a George Khuner Collection, doação da Sra. George Khuner em 1968.',
      ],
    },
  },
  {
    artworkSlug: 'evening-snow-at-kanbara',
    title: 'About the print',
    lede: 'Hiroshige made Evening Snow at Kanbara around 1833–34 for his series Fifty-three Stations of the Tōkaidō.',
    detail: { x: 50, y: 60, zoom: 1.8 },
    figure: {
      alt: 'Snow-laden roofs in the village, with two figures walking through the snow, one under a broad hat with a staff, the other bent under a straw cape.',
      caption: 'Snow, houses and mountains: the subjects The Met lists for it',
    },
    paragraphs: [
      'A woodblock print in ink and colour on paper, 22.5 by 34.9 centimetres. The subjects The Met lists for it are snow, houses and mountains. It came with the Howard Mansfield Collection, bought with the Rogers Fund in 1936.',
    ],
    sources: [met('Evening Snow at Kanbara', 56915)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Hiroshige fez Neve ao entardecer em Kanbara por volta de 1833–34 para sua série As cinquenta e três estações do Tōkaidō.',
      figure: {
        alt: 'Telhados da aldeia carregados de neve, com duas figuras andando na neve, uma sob um chapéu largo e com um cajado, a outra curvada sob uma capa de palha.',
        caption: 'Neve, casas e montanhas: os temas que o Met lista para ela',
      },
      paragraphs: [
        'Uma xilogravura em tinta e cor sobre papel, de 22,5 por 34,9 centímetros. Os temas que o Met lista para ela são neve, casas e montanhas. Veio com a Howard Mansfield Collection, comprada com o Rogers Fund em 1936.',
      ],
    },
  },
  {
    artworkSlug: 'sudden-shower-over-shin-ohashi',
    title: 'About the print',
    lede: 'Sudden Shower over Shin-Ōhashi Bridge and Atake is dated 1857, one of Hiroshige’s One Hundred Famous Views of Edo.',
    detail: { x: 50, y: 70, zoom: 2 },
    figure: {
      alt: 'Figures hurrying across the wooden bridge under fine slanting lines of rain, some under hats and straw cloaks, with the pilings below.',
      caption: 'The sudden shower of the title, in fine lines over the bridge',
    },
    paragraphs: [
      'A woodblock print in ink and colour on paper, 36.5 by 24.3 centimetres. The subjects The Met lists for it are rain, a bridge, boats and figures. It was bought with the Joseph Pulitzer Bequest in 1918.',
    ],
    sources: [met('Sudden Shower over Shin-Ōhashi Bridge and Atake', 37094)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Chuva repentina sobre a ponte Shin-Ōhashi e Atake é datada de 1857, uma das Cem vistas famosas de Edo, de Hiroshige.',
      figure: {
        alt: 'Figuras atravessando às pressas a ponte de madeira sob linhas finas e inclinadas de chuva, algumas com chapéus e capas de palha, com os pilares embaixo.',
        caption: 'A chuva repentina do título, em linhas finas sobre a ponte',
      },
      paragraphs: [
        'Uma xilogravura em tinta e cor sobre papel, de 36,5 por 24,3 centímetros. Os temas que o Met lista para ela são chuva, uma ponte, barcos e figuras. Foi comprada com o Joseph Pulitzer Bequest em 1918.',
      ],
    },
  },
  {
    artworkSlug: 'fireworks-at-ryogoku-bridge',
    title: 'About the print',
    lede: 'Hiroshige’s Fireworks at Ryōgoku Bridge is dated 1858, from the same series, One Hundred Famous Views of Edo.',
    detail: { x: 50, y: 30, zoom: 1.8 },
    figure: {
      alt: 'Two thin red trails of a rocket and a scatter of star-shaped sparks against the night sky.',
      caption: 'The fireworks of the title, against the night sky',
    },
    paragraphs: [
      'A woodblock print in ink and colour on paper, its image 33.7 by 22.2 centimetres. The subjects The Met lists for it are a bridge, fireworks and boats. It was bought with the Joseph Pulitzer Bequest in 1918.',
    ],
    sources: [met('Fireworks at Ryōgoku Bridge', 37093)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Fogos de artifício na ponte Ryōgoku, de Hiroshige, é datada de 1858 e é da mesma série, Cem vistas famosas de Edo.',
      figure: {
        alt: 'Dois rastros finos e vermelhos de um foguete e uma chuva de faíscas em forma de estrela contra o céu da noite.',
        caption: 'Os fogos de artifício do título, contra o céu da noite',
      },
      paragraphs: [
        'Uma xilogravura em tinta e cor sobre papel, com a imagem de 33,7 por 22,2 centímetros. Os temas que o Met lista para ela são uma ponte, fogos de artifício e barcos. Foi comprada com o Joseph Pulitzer Bequest em 1918.',
      ],
    },
  },
  {
    artworkSlug: 'fireworks-at-ikenohata',
    title: 'About the print',
    lede: 'Kobayashi Kiyochika, who lived from 1847 to 1915, made Fireworks at Ikenohata in 1881, the fourteenth year of the Meiji era.',
    detail: { x: 50, y: 35, zoom: 1.8 },
    figure: {
      alt: 'Fireworks falling in streams of red and white through the night, beside a figure in silhouette standing in a tree, above a string of red lanterns.',
      caption: 'Fireworks and lanterns, the subjects The Met lists for it',
    },
    paragraphs: [
      'A woodblock print in ink and colour on paper, its image 20.3 by 31.4 centimetres. The subjects The Met lists for it are fireworks and lanterns. It was a gift of Sebastian and Miki Izzard in 2016.',
    ],
    sources: [met('Fireworks at Ikenohata', 712976)],
    pt: {
      title: 'Sobre a gravura',
      lede: 'Kobayashi Kiyochika, que viveu de 1847 a 1915, fez Fogos de artifício em Ikenohata em 1881, o décimo quarto ano da era Meiji.',
      figure: {
        alt: 'Fogos de artifício caindo em fios vermelhos e brancos na noite, ao lado de uma figura em silhueta de pé numa árvore, acima de um cordão de lanternas vermelhas.',
        caption: 'Fogos de artifício e lanternas, os temas que o Met lista para ela',
      },
      paragraphs: [
        'Uma xilogravura em tinta e cor sobre papel, com a imagem de 20,3 por 31,4 centímetros. Os temas que o Met lista para ela são fogos de artifício e lanternas. Foi doação de Sebastian e Miki Izzard em 2016.',
      ],
    },
  },
];
