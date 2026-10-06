import { LanguageCode } from '@vendure/core';
import { describe, expect, it } from 'vitest';
import { productCustomFields, productVariantCustomFields } from './custom-fields.js';

const bothLanguages = [LanguageCode.en, LanguageCode.pt_BR];
const languagesOf = (texts: readonly { languageCode: LanguageCode }[] | undefined) =>
  texts?.map((text) => text.languageCode);

describe('custom fields', () => {
  // The dashboard shows a field's raw name in a language its label lacks.
  it.each(
    [...productCustomFields, ...productVariantCustomFields].map((field) => [field.name, field]),
  )('%s is labelled in English and Brazilian Portuguese', (_name, field) => {
    expect(languagesOf(field.label)).toEqual(bothLanguages);
    if (field.description) {
      expect(languagesOf(field.description)).toEqual(bothLanguages);
    }
  });
});
