import type { TextFieldManyValidation, TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';
import { type AdminText, inLanguageOf } from '../admin/text';

/** The slug format the data set uses for every work, shared by stories, curations and drops. */
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugHint: AdminText = {
  en: 'lowercase letters and digits joined by single hyphens, like the-rhinoceros',
  pt: 'letras minúsculas e números unidos por um hífen, como the-rhinoceros',
};

export function isSlug(value: string): boolean {
  return slugPattern.test(value);
}

export const validateSlug: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true || !value) {
    return base;
  }
  return isSlug(value) ? true : `Use ${inLanguageOf(options.req, slugHint)}`;
};

/**
 * An ordered list of artwork slugs: each one well formed and none twice, since
 * a curation that lists a work twice is a mistake rather than an emphasis.
 */
export const validateSlugList: TextFieldManyValidation = (value, { required, req }) => {
  if (!value || value.length === 0) {
    return required
      ? inLanguageOf(req, { en: 'Add at least one artwork', pt: 'Adicione ao menos uma obra' })
      : true;
  }
  const malformed = value.filter((slug) => !isSlug(slug));
  if (malformed.length > 0) {
    const list = malformed.join(', ');
    const hint = inLanguageOf(req, slugHint);
    return inLanguageOf(req, {
      en: `Not a slug: ${list}. Use ${hint}`,
      pt: `Não é um slug: ${list}. Use ${hint}`,
    });
  }
  const repeated = value.filter((slug, index) => value.indexOf(slug) !== index);
  if (repeated.length > 0) {
    const list = [...new Set(repeated)].join(', ');
    return inLanguageOf(req, {
      en: `Listed more than once: ${list}`,
      pt: `Repetido na lista: ${list}`,
    });
  }
  return true;
};
