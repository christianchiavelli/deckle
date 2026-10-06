/**
 * DTCG values as CSS. The source keeps the structured values Figma exports
 * (colour objects, `{ value, unit }` dimensions); CSS needs strings.
 */

export interface DtcgColor {
  colorSpace: string;
  components: number[];
  alpha: number;
  hex: string;
}

export interface DtcgDimension {
  value: number;
  unit: 'px' | 'rem';
}

/** What Style Dictionary hands a transform: the token's type, value, path and description. */
export interface TokenLike {
  $type?: string;
  $value: unknown;
  $description?: string;
  path: string[];
}

const ROOT_FONT_SIZE = 16;

/**
 * Type and space scale in rem, so they follow the reader's chosen font size;
 * rules, radii and layout widths stay in px.
 */
function scalesWithText(path: string[]): boolean {
  const [, group, subgroup] = path;
  return group === 'space' || (group === 'font' && subgroup === 'size');
}

export function cssValue(token: TokenLike): string {
  const value = token.$value;
  switch (token.$type) {
    case 'color':
      return (value as DtcgColor).hex.toLowerCase();
    case 'dimension': {
      const { value: amount, unit } = value as DtcgDimension;
      return scalesWithText(token.path) && unit === 'px'
        ? `${String(amount / ROOT_FONT_SIZE)}rem`
        : `${String(amount)}${unit}`;
    }
    case 'fontFamily':
      return (value as string[])
        .map((family) => (/\s/.test(family) ? `'${family}'` : family))
        .join(', ');
    case 'duration': {
      const { value: amount, unit } = value as { value: number; unit: string };
      return `${String(amount)}${unit}`;
    }
    case 'cubicBezier':
      return `cubic-bezier(${(value as number[]).join(', ')})`;
    case 'number':
      // Letter-spacing is stored as a bare number described as "em".
      return token.$description === 'em' ? `${String(value)}em` : String(value);
    case undefined:
    default:
      return String(value);
  }
}
