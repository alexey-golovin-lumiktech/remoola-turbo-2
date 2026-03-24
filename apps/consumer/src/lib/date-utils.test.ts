import { formatDateForInput, isValidDateInputFormat, toDateOnly } from './date-utils';

describe(`toDateOnly`, () => {
  it(`returns empty string for null, undefined, or empty string`, () => {
    expect(toDateOnly(null)).toBe(``);
    expect(toDateOnly(undefined)).toBe(``);
    expect(toDateOnly(``)).toBe(``);
  });

  it(`strips time from ISO datetime (yyyy-MM-dd only)`, () => {
    expect(toDateOnly(`2000-03-12T00:00:00.000Z`)).toBe(`2000-03-12`);
    expect(toDateOnly(`1990-01-15T12:30:00.000Z`)).toBe(`1990-01-15`);
  });

  it(`returns date-only string unchanged`, () => {
    expect(toDateOnly(`2000-03-12`)).toBe(`2000-03-12`);
    expect(toDateOnly(`1990-01-15`)).toBe(`1990-01-15`);
  });
});

describe(`formatDateForInput`, () => {
  it(`returns an empty string for impossible YYYY-MM-DD dates`, () => {
    expect(formatDateForInput(`2024-02-31`)).toBe(``);
    expect(formatDateForInput(`2024-13-01`)).toBe(``);
  });

  it(`trims valid date-only input before returning it`, () => {
    expect(formatDateForInput(` 2024-02-29 `)).toBe(`2024-02-29`);
  });
});

describe(`isValidDateInputFormat`, () => {
  it(`returns true for real calendar dates`, () => {
    expect(isValidDateInputFormat(`2024-02-29`)).toBe(true);
  });

  it(`returns false for impossible calendar dates`, () => {
    expect(isValidDateInputFormat(`2024-02-31`)).toBe(false);
    expect(isValidDateInputFormat(`2023-02-29`)).toBe(false);
  });
});
