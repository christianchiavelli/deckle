/**
 * The admin speaks English and Brazilian Portuguese. Payload shows a label or a
 * description in the language each editor picks; a validation message is a plain
 * string, so it is picked here from the language of the request that asked.
 */
// A mapped type rather than an interface, so Payload accepts it where it takes Record<string, string>.
export type AdminText = Record<'en' | 'pt', string>;

/** The slice of a request that says which language the editor reads. */
export interface LanguageOf {
  i18n?: { language?: string };
}

export function inLanguageOf(req: LanguageOf | undefined, text: AdminText): string {
  return req?.i18n?.language === 'pt' ? text.pt : text.en;
}
