import type { SearchSuggestions, SuggestionSource } from '@deckle/ui';
import { z } from 'zod/mini';

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
 * The store's suggestions for what has been typed, from its own route, checked
 * at the border like any answer. A failed request rejects, and the field keeps
 * what it showed; the form still searches.
 */
export const askTheStore: SuggestionSource = async (query, signal): Promise<SearchSuggestions> => {
  const response = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) {
    throw new Error(`The suggestions answered ${String(response.status)}`);
  }
  return answer.parse(await response.json());
};
