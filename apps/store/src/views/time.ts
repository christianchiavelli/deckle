import type { Copy } from '../copy';

/**
 * Times as the store writes them. Every date is in UTC, the drops' own clock, so
 * a page reads the same from the server and from any browser, wherever it is.
 */

export interface Duration {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

/** Whole days, hours, minutes and seconds in a span; a span already past is all zeros. */
export function durationOf(milliseconds: number): Duration {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export interface CountdownView {
  /** The whole span as a sentence, which is what a screen reader hears. */
  readonly label: string;
  readonly units: readonly { readonly value: string; readonly unit: string }[];
}

const two = (value: number) => String(value).padStart(2, '0');

/**
 * Days, hours and minutes until a drop opens. A minute begun counts whole, so
 * the countdown reaches zero as the drop opens, never a minute before.
 */
export function untilOpening(milliseconds: number, copy: Copy): CountdownView {
  const parts = durationOf(Math.ceil(Math.max(0, milliseconds) / 60_000) * 60_000);
  return {
    label: copy.drops.opensIn(parts),
    units: [
      { value: two(parts.days), unit: copy.drops.units.days },
      { value: two(parts.hours), unit: copy.drops.units.hours },
      { value: two(parts.minutes), unit: copy.drops.units.minutes },
    ],
  };
}

/** Minutes and seconds left on a held copy, by the database's count. */
export function leftToPay(seconds: number, copy: Copy): CountdownView {
  const total = Math.max(0, Math.floor(seconds));
  const parts = { minutes: Math.floor(total / 60), seconds: total % 60 };
  return {
    label: copy.drops.leftToPay(parts),
    units: [
      { value: two(parts.minutes), unit: copy.drops.units.minutes },
      { value: two(parts.seconds), unit: copy.drops.units.seconds },
    ],
  };
}

/** "9:42": a hold's time left, as a clock shows it. */
export function clockOf(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60))}:${two(total % 60)}`;
}

/** Whole days until a moment, rounded down: what "opens in 3 days" counts. */
export function daysUntil(iso: string, now: number): number {
  return durationOf(Date.parse(iso) - now).days;
}

const format = (copy: Copy, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(copy.dateLocale, { ...options, timeZone: 'UTC' });

/** "Thu 15 Oct". */
export function dayOf(iso: string, copy: Copy): string {
  return format(copy, { weekday: 'short', day: 'numeric', month: 'short' }).format(Date.parse(iso));
}

/** "18:00". */
export function timeOf(iso: string, copy: Copy): string {
  return format(copy, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    Date.parse(iso),
  );
}

/** "7 Oct 2026". */
export function dateOf(iso: string, copy: Copy): string {
  return format(copy, { day: 'numeric', month: 'short', year: 'numeric' }).format(Date.parse(iso));
}
