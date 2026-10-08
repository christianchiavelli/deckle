import { en } from './en';
import { ptBr } from './pt-br';

export type { SizingText } from './en';

/** The store's editions: English at the root of the address, Brazilian Portuguese under /pt-br. */
export const LANGS = ['en', 'pt-br'] as const;

export type Lang = (typeof LANGS)[number];

/** Every edition has the English one's shape, word for word. */
export type Copy = typeof en;

export function isLang(value: unknown): value is Lang {
  return LANGS.some((lang) => lang === value);
}

const editions: Record<Lang, Copy> = { en, 'pt-br': ptBr };

/** The words of one edition. */
export function copyOf(lang: Lang): Copy {
  return editions[lang];
}
