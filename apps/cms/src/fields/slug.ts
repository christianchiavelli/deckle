import type { TextFieldManyValidation, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

/** The slug format the data set uses for every work, shared by stories, curations and drops. */
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugHint =
  'lowercase letters and digits joined by single hyphens, like the-rhinoceros';

export function isSlug(value: string): boolean {
  return slugPattern.test(value);
}

export const validateSlug: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true || !value) {
    return base;
  }
  return isSlug(value) ? true : `Use ${slugHint}`;
};

/**
 * An ordered list of artwork slugs: each one well formed and none twice, since
 * a curation that lists a work twice is a mistake rather than an emphasis.
 */
export const validateSlugList: TextFieldManyValidation = (value, { required }) => {
  if (!value || value.length === 0) {
    return required ? 'Add at least one artwork' : true;
  }
  const malformed = value.filter((slug) => !isSlug(slug));
  if (malformed.length > 0) {
    return `Not a slug: ${malformed.join(', ')}. Use ${slugHint}`;
  }
  const repeated = value.filter((slug, index) => value.indexOf(slug) !== index);
  if (repeated.length > 0) {
    return `Listed more than once: ${[...new Set(repeated)].join(', ')}`;
  }
  return true;
};
