import { connection } from 'next/server';
import { copyOf, isLang } from '../../../copy';
import { readCatalogue } from '../../../gateway/reads';
import { queryFrom, suggestionsOf } from '../../../views/search';
import { suggestionListOf } from '../../../views/suggestions';

/**
 * What the search field suggests as one types (ADR 0045): the cached
 * catalogue, read as the search page reads it, written out in the store's
 * words. Each answer is the catalogue as it is now, so the browser keeps none.
 */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const asked = new URL(request.url).searchParams;
  const query = queryFrom(Object.fromEntries(asked));
  // In the words of the page that asks: a Route Handler has no edition of its own.
  const edition = asked.get('lang');
  const copy = copyOf(isLang(edition) ? edition : 'en');
  const { artworks } = await readCatalogue();
  const works = artworks.edges.map((edge) => edge.node);
  return Response.json(
    suggestionListOf(suggestionsOf(works, query, copy.locale, copy.prints.named), query, copy),
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
