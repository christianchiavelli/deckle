import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import {
  clockOf,
  dateOf,
  dayOf,
  daysUntil,
  durationOf,
  leftToPay,
  timeOf,
  untilOpening,
} from './time';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('durationOf', () => {
  it('splits a span into whole days, hours, minutes and seconds', () => {
    expect(durationOf(3 * DAY + 4 * HOUR + 12 * MINUTE + 9_999)).toEqual({
      days: 3,
      hours: 4,
      minutes: 12,
      seconds: 9,
    });
  });

  it('reads a span already past as nothing left', () => {
    expect(durationOf(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('untilOpening', () => {
  it('counts down in days, hours and minutes, and says it as a sentence', () => {
    expect(untilOpening(3 * DAY + 4 * HOUR + 12 * MINUTE, copy)).toEqual({
      label: 'Opens in 3 days, 4 hours, and 12 minutes',
      units: [
        { value: '03', unit: 'days' },
        { value: '04', unit: 'hours' },
        { value: '12', unit: 'minutes' },
      ],
    });
  });

  it('counts a minute begun as whole, so it reaches zero only as the drop opens', () => {
    expect(untilOpening(30_000, copy).label).toBe('Opens in 1 minute');
    expect(untilOpening(0, copy).label).toBe('Opens in 0 minutes');
    expect(untilOpening(-MINUTE, copy).units.map((unit) => unit.value)).toEqual(['00', '00', '00']);
  });

  it('leaves out the days, then the hours, once there are none', () => {
    expect(untilOpening(2 * HOUR + MINUTE, copy).label).toBe('Opens in 2 hours and 1 minute');
    expect(untilOpening(DAY, copy).label).toBe('Opens in 1 day, 0 hours, and 0 minutes');
  });
});

describe('leftToPay', () => {
  it('counts a hold down in minutes and seconds', () => {
    expect(leftToPay(582, copy)).toEqual({
      label: '9 minutes and 42 seconds left to pay',
      units: [
        { value: '09', unit: 'minutes' },
        { value: '42', unit: 'seconds' },
      ],
    });
    expect(leftToPay(61, copy).label).toBe('1 minute and 1 second left to pay');
    expect(leftToPay(-3, copy).label).toBe('0 minutes and 0 seconds left to pay');
  });
});

describe('clockOf', () => {
  it('shows a hold as a clock does', () => {
    expect(clockOf(582)).toBe('9:42');
    expect(clockOf(600)).toBe('10:00');
    expect(clockOf(7.9)).toBe('0:07');
    expect(clockOf(-1)).toBe('0:00');
  });
});

describe('daysUntil', () => {
  it('counts whole days, rounding down', () => {
    const now = Date.parse('2026-10-07T18:00:00Z');
    expect(daysUntil('2026-10-15T18:00:00Z', now)).toBe(8);
    expect(daysUntil('2026-10-08T17:59:00Z', now)).toBe(0);
    expect(daysUntil('2026-10-01T00:00:00Z', now)).toBe(0);
  });
});

describe('dates', () => {
  it('writes a day, a time and a date in UTC, day first', () => {
    const iso = '2026-10-15T18:00:00.000Z';
    expect(dayOf(iso, copy)).toBe('Thu 15 Oct');
    expect(timeOf(iso, copy)).toBe('18:00');
    expect(dateOf('2026-10-07T23:30:00.000Z', copy)).toBe('7 Oct 2026');
  });
});
