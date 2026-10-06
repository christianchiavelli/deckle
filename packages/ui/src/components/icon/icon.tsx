import styled from 'styled-components';
import { type IconName, icons } from './icons.tsx';

const sizes = {
  regular: '1.375rem',
  small: '1.125rem',
  tiny: '0.875rem',
};

export type IconSize = keyof typeof sizes;

const Svg = styled.svg<{ $size: IconSize }>`
  inline-size: ${({ $size }) => sizes[$size]};
  block-size: ${({ $size }) => sizes[$size]};
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

export interface IconProps {
  name: IconName;
  size?: IconSize;
  /**
   * Only for an icon that carries meaning alone. Most sit next to words that
   * already say it, and are hidden from screen readers.
   */
  label?: string;
  className?: string;
}

/** One of Deckle's icons, drawn in `currentColor` so it takes the colour of its text. */
export function Icon({ name, size = 'regular', label, className }: IconProps) {
  const a11y = label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  return (
    <Svg viewBox="0 0 24 24" $size={size} className={className} {...a11y}>
      {icons[name]}
    </Svg>
  );
}
