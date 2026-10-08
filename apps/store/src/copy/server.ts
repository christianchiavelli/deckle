import { lang } from 'next/root-params';
import { type Copy, copyOf, isLang } from '.';

/**
 * The words of the page being rendered. Its edition is the address's first
 * segment, which any Server Component can read without being handed it; the
 * root layout has already refused any other.
 */
export async function getCopy(): Promise<Copy> {
  const segment = await lang();
  return copyOf(isLang(segment) ? segment : 'en');
}
