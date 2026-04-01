import { describe, expect, it } from '@jest/globals';

import {
  getTodayDateInputValue,
  isDateInputOnOrAfter,
  isDateInputTodayOrLater,
  normalizeDateInput,
} from './date-input';

describe(`date input helpers`, () => {
  it(`normalizes valid yyyy-mm-dd inputs and rejects impossible dates`, () => {
    expect(normalizeDateInput(`2026-03-31`)).toBe(`2026-03-31`);
    expect(normalizeDateInput(`2026-02-31`)).toBeNull();
    expect(normalizeDateInput(`03/31/2026`)).toBeNull();
  });

  it(`treats same-day date inputs as valid without timezone parsing drift`, () => {
    expect(isDateInputOnOrAfter(`2026-03-31`, `2026-03-31`)).toBe(true);
    expect(isDateInputOnOrAfter(`2026-03-30`, `2026-03-31`)).toBe(false);
  });

  it(`builds the local date input minimum from the current calendar day`, () => {
    const now = new Date(`2026-03-31T23:45:00`);

    expect(getTodayDateInputValue(now)).toBe(`2026-03-31`);
    expect(isDateInputTodayOrLater(`2026-03-31`, now)).toBe(true);
    expect(isDateInputTodayOrLater(`2026-03-30`, now)).toBe(false);
  });
});
