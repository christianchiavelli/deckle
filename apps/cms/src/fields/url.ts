import type { TextFieldSingleValidation } from 'payload';
import { text } from 'payload/shared';

/**
 * Only absolute http(s) URLs leave the CMS as links: a `javascript:` or
 * relative URL in a story would reach the store's pages through the gateway.
 */
export function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) {
    return false;
  }
  const { protocol } = new URL(value);
  return protocol === 'https:' || protocol === 'http:';
}

export const httpUrlHint = 'an absolute http(s) URL, like https://www.metmuseum.org/';

export const validateHttpUrl: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options);
  if (base !== true || !value) {
    return base;
  }
  return isHttpUrl(value) ? true : `Use ${httpUrlHint}`;
};
