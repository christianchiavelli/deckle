import type { IncomingMessage } from 'node:http';
import type { CmsLanguage } from '../cms/cms.client.js';

interface Accepted {
  readonly tag: string;
  readonly weight: number;
}

/** `pt-BR,pt;q=0.9,en;q=0.8` as tags with their weights; a malformed weight counts as none. */
function acceptedOf(header: string): Accepted[] {
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...parameters] = part.trim().split(';');
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((p) => p.startsWith('q='));
      const weight = quality === undefined ? 1 : Number(quality.slice(2));
      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0 };
    })
    .filter(({ tag, weight }) => tag !== '' && weight > 0);
}

/**
 * The language the CMS's words are read in for this request: Portuguese when
 * that is the most welcome of the two the store writes, English otherwise.
 * The store names its edition's language in `Accept-Language`, from its server
 * and from the browser alike; a request that names neither reads English.
 */
export function languageOf(request: IncomingMessage): CmsLanguage {
  const header = request.headers['accept-language'];
  if (typeof header !== 'string') {
    return 'en';
  }
  // A stable sort: of two equally welcome, the first named wins.
  const [preferred] = acceptedOf(header)
    .filter(
      ({ tag }) => tag === 'pt' || tag.startsWith('pt-') || tag === 'en' || tag.startsWith('en-'),
    )
    .sort((a, b) => b.weight - a.weight);
  return preferred?.tag.startsWith('pt') === true ? 'pt' : 'en';
}
