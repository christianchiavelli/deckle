import type { MetObject } from '../api/met-object.js';

/** A curated work the shop must not sell as it stands, found while importing it. */
export class CurationError extends Error {
  override name = 'CurationError';
}

/**
 * Words The Met puts before an artist's name when the attribution is less than
 * certain, or names someone other than the maker: "After", "Attributed to",
 * "Workshop of", "Issued by", "(?)". The catalog has no place for them, so a
 * work carrying one would read as more certain than The Met says it is.
 */
const QUALIFIED =
  /\b(?:after|attributed|workshop|circle|style|school|follower|manner|copy|possibly|probably|formerly|issued|published)\b|\?/i;

/** Refuses a curated work that is not in the public domain, has no image, or is not firmly attributed. */
export function assertSellable(raw: MetObject, label: string) {
  // The flag is the authority: a work The Met does not mark as public domain
  // is not sold, however old it is.
  if (!raw.isPublicDomain) throw new CurationError(`${label} is not in the public domain`);
  if (raw.primaryImage.trim() === '') throw new CurationError(`${label} has no open-access image`);
  // "Artist and publisher" made the print; a bare "Publisher" only issued it.
  if (QUALIFIED.test(raw.artistPrefix) || /^publisher$/i.test(raw.artistRole.trim())) {
    const who = [raw.artistPrefix, raw.artistDisplayName].filter(Boolean).join(' ');
    throw new CurationError(
      `${label} is attributed with a qualifier: "${who}" (${raw.artistRole})`,
    );
  }
}
