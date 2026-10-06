/**
 * The Shop API operations the gateway sends. Only the fields the gateway maps are
 * selected, so a field commerce renames breaks one parse here, loudly, instead of
 * a page in the store. The custom fields are the ones the commerce seed declares.
 */

const ARTWORK_PRODUCT = /* GraphQL */ `
  fragment ArtworkProduct on Product {
    id
    slug
    name
    featuredAsset {
      source
      width
      height
    }
    variants {
      id
      sku
      priceWithTax
      currencyCode
      customFields {
        paperSize
      }
    }
    customFields {
      metObjectId
      fullTitle
      artistName
      artistBio
      artistNationality
      artistBeginYear
      artistEndYear
      objectDate
      medium
      dimensions
      classification
      department
      culture
      period
      creditLine
      accessionNumber
      objectUrl
      scanWidth
      scanHeight
    }
  }
`;

export const ARTWORK_PRODUCTS = /* GraphQL */ `
  query ArtworkProducts($options: ProductListOptions) {
    products(options: $options) {
      totalItems
      items {
        ...ArtworkProduct
      }
    }
  }
  ${ARTWORK_PRODUCT}
`;

// Only the search index can filter products by collection in the Shop API; it
// returns ids in order, and the products are then read in full by id.
export const COLLECTION_PRODUCT_IDS = /* GraphQL */ `
  query CollectionProductIds($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
      }
    }
  }
`;

export const COLLECTIONS = /* GraphQL */ `
  query Collections {
    collections {
      items {
        id
        slug
        name
      }
    }
  }
`;

export const COLLECTION_BY_SLUG = /* GraphQL */ `
  query CollectionBySlug($slug: String!) {
    collection(slug: $slug) {
      id
      slug
      name
    }
  }
`;
