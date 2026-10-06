import type { ShopProduct } from '../commerce/shop-api.responses.js';
import type { Artwork } from './models/artwork.model.js';
import { priceFrom, printSizesFor } from './print-sizes.js';

/** A commerce product, with The Met's record in its custom fields, as the shop's artwork. */
export function toArtwork(product: ShopProduct): Artwork {
  const fields = product.customFields;
  const scan = { width: fields.scanWidth, height: fields.scanHeight };
  const sizes = printSizesFor(scan, product.variants, fields.metObjectId);
  const asset = product.featuredAsset;

  return {
    id: product.id,
    slug: product.slug,
    title: product.name,
    fullTitle: fields.fullTitle,
    artist:
      fields.artistName === null
        ? null
        : {
            name: fields.artistName,
            bio: fields.artistBio,
            nationality: fields.artistNationality,
            beginYear: fields.artistBeginYear,
            endYear: fields.artistEndYear,
          },
    date: fields.objectDate,
    medium: fields.medium,
    dimensions: fields.dimensions,
    classification: fields.classification,
    department: fields.department,
    culture: fields.culture,
    period: fields.period,
    creditLine: fields.creditLine,
    accessionNumber: fields.accessionNumber,
    museumUrl: fields.objectUrl,
    image:
      asset === null
        ? null
        : {
            url: asset.source,
            width: asset.width,
            height: asset.height,
            scanWidth: scan.width,
            scanHeight: scan.height,
          },
    sizes,
    priceFrom: priceFrom(sizes),
  };
}
