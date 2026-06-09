import { describe, expect, it } from '@jest/globals';

import { zBoolean, zOptionalBoolean } from './envs-parsers';

describe(`envs parsers`, () => {
  it(`coerces representative true-like strings`, () => {
    for (const raw of [`true`, `1`, `yes`, `y`, `Y`]) {
      expect(zBoolean().parse(raw)).toBe(true);
      expect(zOptionalBoolean().parse(raw)).toBe(true);
    }
  });

  it(`coerces representative false-like strings`, () => {
    for (const raw of [`false`, `0`, `no`, `n`, `N`]) {
      expect(zBoolean(true).parse(raw)).toBe(false);
      expect(zOptionalBoolean().parse(raw)).toBe(false);
    }
  });

  it(`treats undefined, null and empty string as undefined for optional parser`, () => {
    expect(zOptionalBoolean().parse(undefined)).toBeUndefined();
    expect(zOptionalBoolean().parse(null)).toBeUndefined();
    expect(zOptionalBoolean().parse(``)).toBeUndefined();
  });

  it(`uses the provided fallback for non-boolean garbage in the required parser`, () => {
    expect(zBoolean().parse(`bogus`)).toBe(false);
    expect(zBoolean(true).parse(`bogus`)).toBe(true);
    expect(zBoolean(true).parse(123)).toBe(true);
  });

  it(`preserves undefined fallback behavior for non-boolean garbage in the optional parser`, () => {
    expect(zOptionalBoolean().parse(`bogus`)).toBeUndefined();
    expect(zOptionalBoolean().parse(123)).toBeUndefined();
  });
});
