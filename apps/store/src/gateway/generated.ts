/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** ISO A paper sizes the shop prints on. */
export type PaperSize =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4';

/** Why a size is not for sale. */
export type PrintSizeUnavailableReason =
  /** The scan could print it, but commerce does not sell it. */
  | 'NOT_OFFERED'
  /** The scan has too few pixels to print this sheet at the minimum resolution. */
  | 'RESOLUTION_TOO_LOW';

export type CatalogueQueryVariables = Exact<{ [key: string]: never; }>;


export type CatalogueQuery = { artworks: { totalCount: number, edges: Array<{ node: { slug: string, title: string, date: string | null, department: string | null, artist: { name: string } | null, image: { url: string, width: number, height: number } | null, priceFrom: { amount: number, currencyCode: string } | null, sizes: Array<{ size: PaperSize, available: boolean }> } }> } };

export type PrintTileFragment = { slug: string, title: string, date: string | null, department: string | null, artist: { name: string } | null, image: { url: string, width: number, height: number } | null, priceFrom: { amount: number, currencyCode: string } | null, sizes: Array<{ size: PaperSize, available: boolean }> };

export type PaperOptionFragment = { size: PaperSize, available: boolean, ppi: number, requiredPixels: number | null, unavailableReason: PrintSizeUnavailableReason | null, variantId: string | null, paper: { width: number, height: number }, image: { width: number, height: number }, price: { amount: number, currencyCode: string } | null };

export type RunFragment = { text: string, bold: boolean, italic: boolean, href: string | null };

export type HomeQueryVariables = Exact<{
  curation: string;
  hero: string;
  sizing: string;
}>;


export type HomeQuery = { curation: { slug: string, title: string, artworks: Array<{ slug: string, title: string, date: string | null, department: string | null, artist: { name: string } | null, image: { url: string, width: number, height: number } | null, priceFrom: { amount: number, currencyCode: string } | null, sizes: Array<{ size: PaperSize, available: boolean }> }> } | null, hero: { slug: string, title: string, date: string | null, artist: { name: string } | null, image: { url: string, width: number, height: number } | null } | null, sizing: { slug: string, title: string, image: { url: string, width: number, height: number, scanWidth: number, scanHeight: number } | null, sizes: Array<{ size: PaperSize, available: boolean, ppi: number, requiredPixels: number | null, unavailableReason: PrintSizeUnavailableReason | null, variantId: string | null, paper: { width: number, height: number }, image: { width: number, height: number }, price: { amount: number, currencyCode: string } | null }> } | null };

export type WorkQueryVariables = Exact<{
  slug: string;
}>;


export type WorkQuery = { artwork: { slug: string, title: string, fullTitle: string, date: string | null, medium: string | null, dimensions: Array<string>, classification: string | null, department: string | null, culture: string | null, period: string | null, creditLine: string | null, accessionNumber: string | null, museumUrl: string, artist: { name: string, bio: string | null, nationality: string | null, beginYear: number | null, endYear: number | null } | null, image: { url: string, width: number, height: number, scanWidth: number, scanHeight: number } | null, sizes: Array<{ size: PaperSize, available: boolean, ppi: number, requiredPixels: number | null, unavailableReason: PrintSizeUnavailableReason | null, variantId: string | null, paper: { width: number, height: number }, image: { width: number, height: number }, price: { amount: number, currencyCode: string } | null }>, story: { title: string, lede: string | null, blocks: Array<
        | { __typename: 'HeadingBlock', level: number, text: Array<{ text: string, bold: boolean, italic: boolean, href: string | null }> }
        | { __typename: 'ParagraphBlock', text: Array<{ text: string, bold: boolean, italic: boolean, href: string | null }> }
        | { __typename: 'QuoteBlock', text: Array<{ text: string, bold: boolean, italic: boolean, href: string | null }> }
      >, sources: Array<{ label: string, url: string | null }> } | null } | null };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const PrintTileFragmentDoc = new TypedDocumentString(`
    fragment PrintTile on Artwork {
  slug
  title
  date
  department
  artist {
    name
  }
  image {
    url
    width
    height
  }
  priceFrom {
    amount
    currencyCode
  }
  sizes {
    size
    available
  }
}
    `, {"fragmentName":"PrintTile"}) as unknown as TypedDocumentString<PrintTileFragment, unknown>;
export const PaperOptionFragmentDoc = new TypedDocumentString(`
    fragment PaperOption on PrintSize {
  size
  available
  ppi
  requiredPixels
  unavailableReason
  variantId
  paper {
    width
    height
  }
  image {
    width
    height
  }
  price {
    amount
    currencyCode
  }
}
    `, {"fragmentName":"PaperOption"}) as unknown as TypedDocumentString<PaperOptionFragment, unknown>;
export const RunFragmentDoc = new TypedDocumentString(`
    fragment Run on TextRun {
  text
  bold
  italic
  href
}
    `, {"fragmentName":"Run"}) as unknown as TypedDocumentString<RunFragment, unknown>;
export const CatalogueDocument = new TypedDocumentString(`
    query Catalogue {
  artworks(first: 48) {
    totalCount
    edges {
      node {
        ...PrintTile
      }
    }
  }
}
    fragment PrintTile on Artwork {
  slug
  title
  date
  department
  artist {
    name
  }
  image {
    url
    width
    height
  }
  priceFrom {
    amount
    currencyCode
  }
  sizes {
    size
    available
  }
}`) as unknown as TypedDocumentString<CatalogueQuery, CatalogueQueryVariables>;
export const HomeDocument = new TypedDocumentString(`
    query Home($curation: String!, $hero: String!, $sizing: String!) {
  curation(slug: $curation) {
    slug
    title
    artworks {
      ...PrintTile
    }
  }
  hero: artwork(slug: $hero) {
    slug
    title
    date
    artist {
      name
    }
    image {
      url
      width
      height
    }
  }
  sizing: artwork(slug: $sizing) {
    slug
    title
    image {
      url
      width
      height
      scanWidth
      scanHeight
    }
    sizes {
      ...PaperOption
    }
  }
}
    fragment PrintTile on Artwork {
  slug
  title
  date
  department
  artist {
    name
  }
  image {
    url
    width
    height
  }
  priceFrom {
    amount
    currencyCode
  }
  sizes {
    size
    available
  }
}
fragment PaperOption on PrintSize {
  size
  available
  ppi
  requiredPixels
  unavailableReason
  variantId
  paper {
    width
    height
  }
  image {
    width
    height
  }
  price {
    amount
    currencyCode
  }
}`) as unknown as TypedDocumentString<HomeQuery, HomeQueryVariables>;
export const WorkDocument = new TypedDocumentString(`
    query Work($slug: String!) {
  artwork(slug: $slug) {
    slug
    title
    fullTitle
    date
    medium
    dimensions
    classification
    department
    culture
    period
    creditLine
    accessionNumber
    museumUrl
    artist {
      name
      bio
      nationality
      beginYear
      endYear
    }
    image {
      url
      width
      height
      scanWidth
      scanHeight
    }
    sizes {
      ...PaperOption
    }
    story {
      title
      lede
      blocks {
        __typename
        ... on ParagraphBlock {
          text {
            ...Run
          }
        }
        ... on HeadingBlock {
          level
          text {
            ...Run
          }
        }
        ... on QuoteBlock {
          text {
            ...Run
          }
        }
      }
      sources {
        label
        url
      }
    }
  }
}
    fragment PaperOption on PrintSize {
  size
  available
  ppi
  requiredPixels
  unavailableReason
  variantId
  paper {
    width
    height
  }
  image {
    width
    height
  }
  price {
    amount
    currencyCode
  }
}
fragment Run on TextRun {
  text
  bold
  italic
  href
}`) as unknown as TypedDocumentString<WorkQuery, WorkQueryVariables>;