import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';

const Group = styled.div`
  display: inline-grid;
  grid-template-columns: 2.5rem minmax(2rem, auto) 2.5rem;
  align-items: center;
  border: ${t.strokeWidth.hairline} solid ${t.stroke.strong};
  border-radius: ${t.radius.chip};
`;

const Step = styled.button`
  display: grid;
  place-items: center;
  block-size: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: ${t.radius.chip};
  background: none;
  color: ${t.text.primary};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${t.surface.sheet};
  }

  &:disabled {
    color: ${t.text.muted};
    cursor: not-allowed;
  }
`;

const Value = styled.output`
  font-variant-numeric: tabular-nums;
  font-weight: ${t.type.label.weight};
  text-align: center;
`;

export interface QuantityProps {
  value: number;
  /** Names the group, such as "How many of Melencolia I, A3". */
  label: string;
  /** The buttons' names: "One fewer" and "One more". */
  fewer: string;
  more: string;
  min?: number;
  max?: number;
  /** While a change is on its way, both buttons wait. */
  busy?: boolean;
  onChange?: (value: number) => void;
}

/**
 * How many of a line, one up or one down at a time: buttons, not a number
 * field, so a phone opens no keyboard. Below the least, the line's remove
 * button is the way out.
 */
export function Quantity({
  value,
  label,
  fewer,
  more,
  min = 1,
  max = 10,
  busy = false,
  onChange,
}: QuantityProps) {
  return (
    <Group role="group" aria-label={label} aria-busy={busy || undefined}>
      <Step
        type="button"
        aria-label={fewer}
        disabled={busy || value <= min}
        onClick={() => onChange?.(value - 1)}
      >
        <Icon name="minus" size="small" />
      </Step>
      <Value aria-live="polite">{value}</Value>
      <Step
        type="button"
        aria-label={more}
        disabled={busy || value >= max}
        onClick={() => onChange?.(value + 1)}
      >
        <Icon name="plus" size="small" />
      </Step>
    </Group>
  );
}
