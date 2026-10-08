import type { SearchSuggestions, SuggestionSource } from '@deckle/ui';
import { z } from 'zod/mini';
import type { Lang } from '../copy';

const suggestion = z.object({
  href: z.string(),
  label: z.string(),
  detail: z.optional(z.string()),
  count: z.optional(z.string()),
  image: z.optional(z.object({ src: z.string(), width: z.number(), height: z.number() })),
});

const answer = z.object({
  groups: z.array(z.object({ label: z.string(), suggestions: z.array(suggestion) })),
  all: z.nullable(z.object({ href: z.string(), label: z.string() })),
  none: z.string(),
  status: z.string(),
});

/**
 * The store's suggestions for what has been typed, from its own route, in the
 * words of the page's edition, checked at the border like any answer. A failed
 * request rejects, and the field keeps what it showed; the form still searches.
 */
const askIn =
  (lang: Lang): SuggestionSource =>
  async (query, signal): Promise<SearchSuggestions> => {
    const asked = new URLSearchParams({ q: query, lang });
    const response = await fetch(`/api/suggestions?${asked.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(`The suggestions answered ${String(response.status)}`);
    }
    return answer.parse(await response.json());
  };

// One per edition, made once, so a field's source stays the same from render to render.
const sources: Record<Lang, SuggestionSource> = { en: askIn('en'), 'pt-br': askIn('pt-br') };

export const askTheStore = (lang: Lang): SuggestionSource => sources[lang];
