import { roman } from '../views/listing';
import type { Copy, SizingText } from '.';

/**
 * The store's words in Brazilian Portuguese, the edition under /pt-br. Its
 * shape is the English edition's, so a missing or extra word fails the types.
 */

/** Joins "1 artista" and "4 gravuras" the way Portuguese does. */
const LIST = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

/** "1 gravura", "3 gravuras". */
const gravuras = (count: number) => (count === 1 ? '1 gravura' : `${String(count)} gravuras`);

/** "1 minuto", "3 minutos": a unit said in a sentence. */
const unit = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

/** Commerce's technique families, in the Brazilian press's words. */
const TECHNIQUES: Readonly<Record<string, string>> = {
  'Woodblock prints': 'Xilogravuras japonesas',
  Woodcuts: 'Xilogravuras',
  Lithographs: 'Litografias',
  Engravings: 'Gravuras a buril',
  Etchings: 'Águas-fortes',
  Mezzotints: 'Meias-tintas',
  Drypoints: 'Pontas-secas',
  Aquatints: 'Águas-tintas',
};

/** Along which side of the image: "de largura", "na altura". */
const across = (side: 'across' | 'tall' | 'down', of: 'de' | 'na') =>
  side === 'across' ? `${of} largura` : `${of} altura`;

export const ptBr: Copy = {
  lang: 'pt-br',
  htmlLang: 'pt-BR',
  edition: { short: 'PT', name: 'Português' },
  path: (href: string) => (href === '/' ? '/pt-br' : `/pt-br${href}`),
  locale: 'pt-BR',
  dateLocale: 'pt-BR',
  chrome: {
    skip: 'Pular para o conteúdo',
    language: 'Idioma',
    home: 'Deckle, página inicial',
    nav: 'Loja',
    prints: 'Gravuras',
    collections: 'Coleções',
    journal: 'Histórias',
    search: 'Buscar',
    searchPlaceholder: 'Busque gravuras, artistas e técnicas',
    theme: 'Tema',
    menuOpen: 'Menu',
    menuClose: 'Fechar o menu',
    footer: 'Rodapé',
    about:
      'Gravuras de obras em domínio público do Met, nos tamanhos que suas digitalizações aguentam.',
    shop: 'Loja',
    aboutColumn: 'Sobre',
    howWeSize: 'Como definimos os tamanhos',
    drops: 'Drops',
    howDropsWork: 'Como funcionam os drops',
    signIn: 'Entrar com chave de acesso',
    account: 'Sua conta',
    cart: (count: number) => `Carrinho, ${gravuras(count)}`,
    small:
      'Imagens: The Metropolitan Museum of Art, Open Access (CC0). O Deckle é um projeto de portfólio: a compra é simulada e nada é enviado.',
  },
  home: {
    title: 'Gravuras do Met, nos tamanhos que suas digitalizações aguentam',
    intro: (total: string) =>
      `${total} obras da coleção Open Access do museu, de Dürer a Hiroshige, impressas em papel de algodão a partir das digitalizações do próprio Met. Nada é ampliado artificialmente: uma linha gravada em 1514 continua sendo uma linha.`,
    browse: 'Ver as gravuras',
    howWeSize: 'Como definimos os tamanhos',
    prints: 'As gravuras',
    seeAll: (total: string) => `Ver as ${total} gravuras`,
    sizingTitle: 'Até que tamanho uma gravura pode ir?',
    sizing: ({ work, side, scan, largest, ppi, next, required }: SizingText) =>
      [
        'Cada polegada de papel precisa de 240 pixels da digitalização, ou as linhas finas começam a borrar a um braço de distância.',
        `A digitalização do Met de ${work} tem ${scan} pixels ${across(side, 'de')}: o bastante para ${largest} a ${ppi}.`,
        next === null || required === null
          ? 'É a maior folha que imprimimos.'
          : `${next} precisaria de ${required}, então imprimimos até ${largest} e nada maior.`,
      ].join(' '),
    printed: 'Imprimimos',
    tooFewPixels: 'Pixels insuficientes',
    collections: 'Coleções',
    everyCollection: 'Todas as coleções',
    journal: 'Histórias',
    everyStory: 'Todas as histórias',
  },
  prints: {
    title: 'As gravuras',
    lede: (total: string) =>
      `${total} obras da coleção Open Access do Met, cada uma impressa em papel de algodão nos tamanhos que sua digitalização aguenta.`,
    filters: 'Filtrar as gravuras',
    unit: 'gravuras',
    technique: 'Técnica',
    named: (technique: string) => TECHNIQUES[technique] ?? technique,
    centuryGroup: 'Século',
    century: (n: number) => roman(n),
    printedAt: 'Impressa em',
    all: 'Todas',
    anySize: 'Qualquer tamanho',
    sizeAndUp: (size: string) => `${size} ou maior`,
    count: (shown: number, total: number | null) =>
      `${gravuras(shown)}${total === null ? '' : ` de ${String(total)}`}, da mais antiga à mais nova`,
    clear: 'Limpar os filtros',
    asideTitle: 'Por que algumas gravuras param no A4',
    aside:
      'Cada tamanho precisa de pixels suficientes da digitalização para cada polegada de papel. Onde a digitalização do Met acaba, acabam os tamanhos: nunca imprimimos uma obra maior do que sua digitalização aguenta.',
    howWeSize: 'Como definimos os tamanhos',
  },
  collections: {
    title: 'Coleções',
    lede: 'Gravuras que o editor reuniu, poucas de cada vez, com uma linha sobre por que elas ficam lado a lado.',
    see: (count: number) => `Ver as ${String(count)} gravuras`,
    prints: gravuras,
    crumbs: 'Trilha de navegação',
    more: 'Mais coleções',
    every: 'Todas as coleções',
  },
  journal: {
    title: 'Histórias',
    lede: 'Textos curtos sobre as obras: quem as fez, como, e o que observar. Cada fato vem do registro do Met, que cada texto cita.',
    more: 'Mais histórias',
    readBeside: 'Ler ao lado da gravura',
  },
  sizes: {
    title: 'Como definimos os tamanhos',
    lede: (ppi: string) =>
      `Uma gravura só é tão nítida quanto a digitalização por trás dela. Oferecemos cada obra nos tamanhos que sua digitalização preenche a ${ppi} pixels por polegada de papel, e em nenhum maior.`,
    examples: 'Três digitalizações, três limites',
    only: (size: string) => `Só ${size}`,
    upTo: (size: string) => `Até ${size}`,
    example: (maker: string, width: string, height: string) =>
      `${maker}. A digitalização do Met tem ${width} × ${height} px.`,
    limit: (size: string, required: string, side: 'across' | 'down', scan: string) =>
      `${size} precisaria de ${required} px ${across(side, 'na')} da imagem; a digitalização tem ${scan}.`,
    table: 'O que cada tamanho exige',
    caption: (ppi: string) =>
      `Cada folha mantém uma margem branca; a impressão fica dentro dela, a ${ppi} ppi ou mais.`,
    headers: {
      size: 'Tamanho',
      area: 'Área impressa',
      pixels: (ppi: string) => `A ${ppi} ppi`,
      works: 'Obras que chegam lá',
    },
    note: 'Uma gravura mantém suas proporções, então encosta na margem pela largura ou pela altura, e precisa dos pixels desse lado.',
    noneAt: (size: string) =>
      `Nenhuma das digitalizações que o Met oferece para estas obras é grande o bastante para ${size}.`,
    rules: 'As regras por trás',
    density: (ppi: string) => `${ppi} pixels por polegada`,
    densityText:
      'Nessa densidade, linhas gravadas a um fio de cabelo uma da outra continuam separadas a um braço de distância. Abaixo dela, o traço mais fino começa a borrar.',
    upscaled: 'Nada ampliado artificialmente',
    upscaledText:
      'Ampliar uma digitalização inventa os pixels que faltam, e pixels inventados saem como bordas borradas. Onde a digitalização acaba, paramos no tamanho anterior.',
    file: 'Lido do próprio arquivo',
    fileText:
      'A API do Met não diz o tamanho de uma imagem, então lemos o cabeçalho de cada digitalização. Os números na página de uma gravura são os do arquivo, não uma estimativa.',
    browse: 'Ver as gravuras',
  },
  search: {
    title: 'Busca',
    results: (query: string) => `Gravuras para “${query}”`,
    none: (query: string) => `Nenhuma gravura para “${query}”`,
    again: 'Buscar de novo',
    count: gravuras,
    nothing: (total: string) =>
      `A loja tem ${total} obras, e nenhum título, artista ou técnica traz essas palavras. Tente um artista, um título ou uma técnica:`,
    ask: 'Busque na loja um artista, um título ou uma técnica:',
    suggestions: ['Hokusai', 'Melencolia', 'Rembrandt', 'Hiroshige'],
    browse: 'Ver as gravuras',
    suggest: {
      label: 'Sugestões',
      artists: 'Artistas',
      techniques: 'Técnicas',
      prints: 'Gravuras',
      all: (count: number, query: string) =>
        count === 1
          ? `1 gravura para “${query}”`
          : `Todas as ${String(count)} gravuras para “${query}”`,
      none: (query: string) => `Nenhuma gravura, artista ou técnica corresponde a “${query}”`,
      /** "1 artista e 4 gravuras": what a screen reader hears as the list changes. */
      status: (artists: number, techniques: number, prints: number) =>
        LIST.format(
          [
            [artists, 'artista', 'artistas'] as const,
            [techniques, 'técnica', 'técnicas'] as const,
            [prints, 'gravura', 'gravuras'] as const,
          ]
            .filter(([count]) => count > 0)
            .map(([count, one, many]) => unit(count, one, many)),
        ),
    },
  },
  tile: {
    from: (amount: string) => `A partir de ${amount}`,
    only: (size: string) => `Só ${size}`,
  },
  work: {
    size: 'Tamanho',
    unframed: (size: string) => `${size}, sem moldura`,
    notForSale: 'Fora de venda',
    unavailable: 'Resolução baixa',
    missingPrice: 'Preço não definido',
    tooSmall: (size: string, required: string, side: 'across' | 'down', scan: string) =>
      `${size} precisaria de ${required} px ${across(side, 'na')} da imagem. A digitalização do Met tem ${scan}, e nunca ampliamos artificialmente.`,
    caption: (width: string, height: string) => `Digitalização do Met · ${width} × ${height} px`,
    zoom: 'Ver o detalhe de perto',
    printedAt: (ppi: string, size: string) =>
      `Impressa a ${ppi} em ${size}, a partir da digitalização do próprio museu`,
    paper: 'Impressão com pigmento em papel de algodão, enviada enrolada em tubo',
    openAccess: 'Domínio público, da coleção Open Access do Met',
    source: 'Fonte',
    recordTitle: 'Do registro do museu',
    museum: 'metmuseum.org',
    missing: 'Não registrado',
    record: {
      artist: 'Artista',
      date: 'Data',
      medium: 'Técnica',
      dimensions: 'Dimensões',
      culture: 'Cultura',
      period: 'Período',
      creditLine: 'Crédito',
      objectNumber: 'Número de tombo',
      rights: 'Direitos',
      scan: 'Digitalização',
    },
    rights: 'Domínio público, Open Access (CC0)',
    scan: (width: string, height: string) => `${width} × ${height} px, lidos do arquivo`,
    unknownArtist: 'Artista desconhecido',
    more: 'Mais gravuras',
    crumbs: 'Trilha de navegação',
    prints: 'Gravuras',
  },
  added: {
    title: 'Adicionada ao carrinho',
    detail: (size: string, price: string) => `${size}, sem moldura · ${price}`,
    summary: (count: number, subtotal: string) => `${gravuras(count)} no carrinho · ${subtotal}`,
    cart: 'Ver o carrinho',
    checkout: 'Finalizar compra',
    close: 'Fechar',
    add: 'Adicionar ao carrinho',
    adding: 'Adicionando…',
    failed: 'Não deu para adicionar a gravura agora. Tente de novo em instantes.',
  },
  cart: {
    title: 'Seu carrinho',
    lede: 'Cada gravura é feita quando é pedida: pigmento em papel de algodão, enrolada em tubo.',
    emptyTitle: 'Seu carrinho está vazio',
    emptyLede:
      'Cada gravura é feita quando é pedida, nos tamanhos que sua digitalização aguenta. Todas as que a loja vende estão numa página só.',
    browse: 'Ver as gravuras',
    size: (size: string, price: string) => `${size}, sem moldura · ${price} cada`,
    quantity: (title: string, size: string) => `Quantas de ${title}, ${size}`,
    fewer: 'Uma a menos',
    more: 'Uma a mais',
    remove: 'Remover',
    summary: 'Resumo do pedido',
    subtotal: (count: number) => `Subtotal, ${gravuras(count)}`,
    shipping: 'Frete, enrolada em tubo',
    total: 'Total',
    checkout: 'Finalizar compra',
    keepBrowsing: 'Continuar vendo',
    testTitle: 'Uma compra de teste',
    test: 'Nenhum cartão é pedido e nada é enviado: o Deckle é um projeto de portfólio.',
    failed: 'Não deu para ler o carrinho agora. Tente de novo em instantes.',
    changeFailed: 'Essa mudança não foi feita. Tente de novo em instantes.',
  },
  checkout: {
    title: 'Finalizar compra',
    crumbs: 'Trilha de navegação',
    cart: 'Carrinho',
    contact: 'Contato',
    contactLede: 'Para o recibo. Nada mais é enviado para ele.',
    email: 'E-mail',
    address: 'Endereço de entrega',
    fullName: 'Nome completo',
    street: 'Endereço',
    street2: 'Complemento',
    street2Hint: 'Se houver',
    city: 'Cidade',
    postalCode: 'CEP',
    country: 'País',
    delivery: 'Entrega',
    standard: 'Frete padrão',
    numbered: 'Frete de um exemplar numerado',
    tube: 'Enrolada em tubo, com rastreio, num valor fixo para qualquer destino.',
    included: 'Incluído',
    payment: 'Pagamento',
    testTitle: 'Um pagamento de teste',
    test: 'Ele é aprovado na hora e nenhum dinheiro circula. O Deckle é um projeto de portfólio: o pedido é real, o pagamento e o pacote não.',
    place: (total: string) => `Fazer o pedido · ${total}`,
    placing: 'Fazendo seu pedido…',
    summary: 'Seu pedido',
    invalid: {
      email: 'Digite um e-mail, como voce@exemplo.com',
      fullName: 'Digite o nome de quem recebe o tubo',
      streetLine1: 'Digite a rua e o número',
      streetLine2: 'Use menos de 120 caracteres',
      city: 'Digite a cidade',
      postalCode: 'Digite o CEP',
      countryCode: 'Escolha um país',
    },
    paymentFailed: 'O pagamento de teste não foi aprovado, e nada foi cobrado. Tente de novo.',
    failed: 'Não deu para fazer o pedido agora. Tente de novo em instantes.',
    copyRow: (number: number, size: number) => `Exemplar ${String(number)} de ${String(size)}`,
    copyTitle: (title: string, number: number, size: number) =>
      `${title}, exemplar ${String(number)} de ${String(size)}`,
    copySize: (paper: string, number: number, size: number) =>
      `${paper}, numerado ${String(number)}/${String(size)} a lápis`,
    held: (left: string) => `Reservado para você · faltam ${left}`,
    heldText: (number: number) =>
      `Pague antes que o tempo acabe, ou o exemplar ${String(number)} volta para a edição e fica para a próxima pessoa.`,
    notHeldTitle: 'Este exemplar não está mais reservado para você',
    notHeld:
      'Os dez minutos acabaram, ou ele já foi pago. A página do drop mostra como estão os exemplares.',
    toDrop: 'Voltar ao drop',
    inProgress: 'Já há um pagamento em andamento para este exemplar: aguarde um instante.',
  },
  order: {
    placed: 'Pedido feito',
    thanks: (name: string | null) => (name === null ? 'Obrigado' : `Obrigado, ${name}`),
    lede: (code: string, email: string | null) =>
      email === null
        ? `O pedido ${code} foi feito.`
        : `O pedido ${code} foi feito, e o recibo está a caminho de ${email}.`,
    title: (code: string) => `Pedido ${code}`,
    shipTo: 'Entrega para',
    paid: 'Pago',
    paidOn: (date: string) => `Pagamento de teste, aprovado em ${date}`,
    nothingShipsTitle: 'Nada é enviado',
    nothingShips:
      'O Deckle é um projeto de portfólio: o pedido está no painel do commerce e o recibo no Mailpit, e as gravuras ficam no museu.',
    keepBrowsing: 'Continuar vendo',
    missingTitle: 'Este pedido não está aqui',
    missing:
      'Um pedido só aparece no navegador que o fez, e o recibo tem todos os detalhes. As gravuras estão todas numa página só.',
    browse: 'Ver as gravuras',
  },
  drops: {
    title: 'Drops',
    lede: 'Cinquenta exemplares numerados de uma gravura por vez, numa hora marcada: quem chega primeiro leva, e é um por pessoa.',
    headline: (title: string, size: number) => `${title}, em ${String(size)} exemplares numerados`,
    openNow: 'Aberto agora',
    opens: (day: string) => `Abre em ${day}`,
    allClaimed: 'Todos os exemplares vendidos',
    open: 'Livres',
    openOf: (open: number, size: number) => `${String(open)} de ${String(size)}`,
    opensTerm: 'Abre',
    price: 'Preço',
    limit: 'Limite',
    onePerPerson: 'Um por pessoa',
    at: (day: string, time: string) => `${day}, ${time} UTC`,
    claim: 'Garantir um exemplar',
    see: 'Ver o drop',
    announceOpen: (title: string) => `A edição numerada de ${title} está aberta`,
    announceSoon: (title: string, day: string, time: string) =>
      `Uma edição numerada de ${title} abre em ${day}, às ${time} UTC`,
    callout: (size: number) => `Uma edição numerada de ${String(size)}`,
    calloutOpen: 'Aberto agora. Um por pessoa, com chave de acesso',
    calloutSoon: (day: string, time: string) =>
      `Abre em ${day}, às ${time} UTC. Um por pessoa, com chave de acesso`,
    join: 'Entrar com chave de acesso',
    readyWithPasskey: 'Prepare sua chave de acesso',
    howTheyWork: 'Como funcionam os drops',
    copyWords: {
      open: 'livre',
      held: 'reservado enquanto alguém paga',
      claimed: 'vendido',
      yours: 'seu',
    },
    tally: { open: 'livres', held: 'reservados', claimed: 'vendidos' },
    noneClaimed: (size: number) => `${String(size)} exemplares · nenhum vendido ainda`,
    standing: (size: number, claimed: number, held: number, open: number) =>
      `${String(size)} exemplares · ${String(claimed)} vendidos · ${String(held)} reservados · ${String(open)} livres`,
    copiesLabel: (size: number, open: number) =>
      `Exemplares 1 a ${String(size)}, ${String(open)} livres`,
    opensIn: (parts: { days: number; hours: number; minutes: number }) =>
      `Abre em ${LIST.format(
        [
          parts.days > 0 ? unit(parts.days, 'dia', 'dias') : null,
          parts.days > 0 || parts.hours > 0 ? unit(parts.hours, 'hora', 'horas') : null,
          unit(parts.minutes, 'minuto', 'minutos'),
        ].filter((part) => part !== null),
      )}`,
    leftToPay: (parts: { minutes: number; seconds: number }) =>
      `Faltam ${LIST.format([
        unit(parts.minutes, 'minuto', 'minutos'),
        unit(parts.seconds, 'segundo', 'segundos'),
      ])} para pagar`,
    units: { days: 'dias', hours: 'horas', minutes: 'minutos', seconds: 'segundos' },
  },
  drop: {
    crumbs: 'Trilha de navegação',
    soon: (days: number) =>
      days < 1 ? 'Abre hoje' : days === 1 ? 'Abre amanhã' : `Abre em ${String(days)} dias`,
    openNow: 'Aberto agora',
    held: 'Reservado para você',
    yours: 'Seu',
    allClaimed: 'Todos os exemplares vendidos',
    heldTitle: (number: number, size: number) =>
      `O exemplar ${String(number)} de ${String(size)} é seu por dez minutos`,
    heldText: (number: number, size: number) =>
      `Pague antes que o tempo acabe e ele é impresso, numerado ${String(number)}/${String(size)} a lápis e enviado enrolado em tubo. Se não pagar, ele volta para a edição e fica para a próxima pessoa.`,
    soldTitle: (number: number, size: number) =>
      `O exemplar ${String(number)} de ${String(size)} é seu`,
    soldText: (number: number, size: number) =>
      `Está pago: será impresso, numerado ${String(number)}/${String(size)} a lápis e enviado enrolado em tubo.`,
    order: 'Ver o pedido',
    pay: (price: string) => `Pagar ${price}`,
    letGo: 'Liberar o exemplar',
    claiming: 'Garantindo…',
    small:
      'Antes, você entra com uma chave de acesso: nenhuma senha para lembrar, e um exemplar por pessoa.',
    noneOpen:
      'Todos os exemplares estão reservados ou vendidos. Um reservado volta se os dez minutos dele acabarem.',
    refused: {
      NO_SUCH_DROP: 'Este drop não está mais na loja.',
      DROP_NOT_OPEN: 'O drop ainda não abriu.',
      NO_COPY_OPEN:
        'Todos os exemplares estão reservados ou vendidos agora. Um reservado pode voltar.',
      ALREADY_HAS_COPY: 'É um exemplar por pessoa, e esta conta já tem um deste drop.',
      HOLDING_ANOTHER: 'Antes, pague o exemplar que você reservou em outro drop, ou libere-o.',
      UNAUTHENTICATED: 'Antes, entre com uma chave de acesso.',
    },
    failed: 'Não deu certo. Tente de novo em instantes.',
    copiesTitle: (size: number) =>
      size === 50 ? 'Os cinquenta exemplares' : `Os ${String(size)} exemplares`,
    live: 'Atualiza conforme são garantidos',
    copiesText:
      'Cada quadrado é um exemplar. O próximo número livre vai para quem garantir primeiro, e um exemplar reservado volta se os dez minutos dele acabarem.',
    howTitle: 'Como funciona um drop',
    steps: [
      {
        title: 'Entre com uma chave de acesso',
        text: 'Sua digital, seu rosto ou o PIN do aparelho, nunca uma senha. Uma chave de acesso pertence a uma pessoa, e é assim que vale um exemplar por pessoa.',
      },
      {
        title: 'Garanta um exemplar',
        text: 'O próximo número livre fica reservado para você por dez minutos. Se não pagar a tempo, ele volta para a edição.',
      },
      {
        title: 'Imprimimos e numeramos',
        text: 'Pigmento em papel de algodão, numerado a lápis e enviado enrolado em tubo.',
      },
    ],
    printTitle: 'A gravura',
    record: {
      size: 'Tamanho',
      resolution: 'Resolução',
      paper: 'Papel',
      edition: 'Edição',
      price: 'Preço',
      limit: 'Limite',
    },
    sizeOf: (size: string, paper: string) => `${size}, ${paper}`,
    resolutionOf: (ppi: string, width: string, height: string) =>
      `${ppi}, a partir da digitalização do Met de ${width} × ${height} px`,
    paper: 'Papel de algodão, tintas de pigmento',
    editionOf: (size: number) =>
      `${String(size)} exemplares, numerados de 1/${String(size)} a ${String(size)}/${String(size)}`,
    missing: 'Não definido',
  },
  passkey: {
    title: 'Garantir com chave de acesso',
    text: 'É um exemplar por pessoa, então o drop pergunta quem é você: com uma chave de acesso que seu aparelho guarda, criada uma vez aqui ou usada de novo.',
    use: 'Usar minha chave de acesso',
    make: 'Criar uma chave de acesso',
    waiting: 'Esperando seu aparelho…',
    failed:
      'Seu aparelho não respondeu. Tente de novo, ou crie uma chave de acesso se este aparelho não tiver uma do Deckle.',
    unsupported:
      'Este navegador não cria nem usa chaves de acesso. Um Chrome, Edge, Firefox ou Safari atual consegue.',
    small:
      'O Deckle guarda só a metade pública da chave de acesso. Seu rosto, sua digital ou seu PIN ficam no seu aparelho.',
    close: 'Fechar',
  },
  account: {
    signInTitle: 'Entrar com chave de acesso',
    signInLede:
      'Sua conta é uma chave de acesso que seu aparelho guarda: nenhuma senha para escolher, lembrar ou vazar. Ela só é necessária para os drops; as gravuras do carrinho não precisam dela.',
    keepsTitle: 'O que o Deckle guarda',
    keeps:
      'A metade pública da chave de acesso e um número que distingue esta conta. Seu rosto, sua digital ou seu PIN ficam no seu aparelho.',
    title: 'Sua conta',
    since: (date: string) => `Você entrou com uma chave de acesso criada em ${date}.`,
    copies: 'Seus exemplares',
    noCopies:
      'Nenhum exemplar ainda. Os exemplares numerados de um drop são garantidos na página dele.',
    seeDrops: 'Ver os drops',
    heldChip: (left: string) => `Reservado para você · faltam ${left}`,
    paidChip: 'Pago',
    copyTitle: (title: string, number: number, size: number) =>
      `${title}, exemplar ${String(number)} de ${String(size)}`,
    copyDetail: (paper: string, price: string) => `${paper}, numerado a lápis · ${price}`,
    pay: (price: string) => `Pagar ${price}`,
    order: (code: string) => `Pedido ${code}`,
    signOut: 'Sair',
    failed: 'Não deu para ler a conta agora. Tente de novo em instantes.',
  },
  howDrops: {
    title: 'Como funcionam os drops',
    lede: 'Um drop são cinquenta exemplares numerados de uma gravura, lançados numa hora marcada. Quem chega primeiro leva o próximo número, e ninguém leva dois.',
    stepsTitle: 'Três passos',
    steps: [
      {
        title: 'Entre com uma chave de acesso',
        text: 'Seu aparelho cria uma na primeira vez, com seu rosto, sua digital ou o PIN dele. Não há senha, e uma chave de acesso é uma pessoa.',
      },
      {
        title: 'Garanta um exemplar',
        text: 'O próximo número livre é seu, reservado por dez minutos. Todo mundo vê ele sair, na página do drop, na mesma hora.',
      },
      {
        title: 'Pague antes que o tempo acabe',
        text: 'Pago, ele é impresso, numerado a lápis e enrolado em tubo. Sem pagamento, ele volta para a edição e fica para a próxima pessoa.',
      },
    ],
    rulesTitle: 'As regras por trás',
    rules: [
      {
        title: 'Nunca cinquenta e um',
        text: 'Os números ficam num banco de dados que entrega cada um uma vez só, num único passo, mesmo para mil pessoas no mesmo segundo. O estoque da loja conta todos de novo.',
      },
      {
        title: 'Um por pessoa',
        text: 'Uma chave de acesso representa uma pessoa, e o banco de dados recusa um segundo exemplar para ela, reservado ou pago.',
      },
      {
        title: 'Dez minutos, e não mais',
        text: 'O relógio de um exemplar reservado é o do banco de dados, não o do seu navegador. Quando ele acaba, o exemplar fica livre de novo, com alguém olhando ou não.',
      },
      {
        title: 'Um pagamento de teste',
        text: 'O Deckle é um projeto de portfólio: o pedido é real e chega ao painel da loja, e o pagamento é aprovado na hora, sem dinheiro circulando.',
      },
    ],
    see: 'Ver os drops',
  },
  notFound: {
    title: 'Esta página não está aqui',
    text: 'O endereço pode estar errado, ou a gravura pode ter saído da loja. Todas as gravuras que vendemos estão numa página só, e a busca lá em cima encontra qualquer uma.',
    browse: 'Ver as gravuras',
    home: 'Ir para a página inicial',
    mark: '404',
  },
  preview: {
    // The Brazilian press's name for a print pulled to check the plate before the edition.
    label: 'Prova de estado',
    message: 'Rascunhos, ainda não publicados',
    leave: 'Ver a página publicada',
  },
};
