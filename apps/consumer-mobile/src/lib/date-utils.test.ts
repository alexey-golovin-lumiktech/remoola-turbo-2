import { toDateOnly } from './date-utils';

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
