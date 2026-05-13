import { describe, expect, it } from '@jest/globals';

import {
  booleanSearchParam,
  buildQueryString,
  dateSearchParam,
  finiteNumberSearchParam,
  positiveIntegerSearchParam,
  trimmedSearchParam,
} from './query-contract';

describe(`query contract helpers`, () => {
  it(`normalizes repeated and whitespace-only search params`, () => {
    expect(trimmedSearchParam([`  first  `, `second`])).toBe(`first`);
    expect(trimmedSearchParam(`   `)).toBeUndefined();
  });

  it(`accepts only explicit boolean query values`, () => {
    expect(booleanSearchParam(`true`)).toBe(true);
    expect(booleanSearchParam(`false`)).toBe(false);
    expect(booleanSearchParam(`yes`)).toBeUndefined();
  });

  it(`omits invalid numeric and date values before client dispatch`, () => {
    expect(positiveIntegerSearchParam(`0`, 1)).toBe(1);
    expect(finiteNumberSearchParam(`not-a-number`)).toBeUndefined();
    expect(dateSearchParam(`not-a-date`)).toBeUndefined();
  });

  it(`accepts only strict calendar date search params`, () => {
    expect(dateSearchParam(`2026-04-01`)).toBe(`2026-04-01`);
    expect(dateSearchParam(`2024-02-29`)).toBe(`2024-02-29`);
    expect(dateSearchParam(`1`)).toBeUndefined();
    expect(dateSearchParam(`123`)).toBeUndefined();
    expect(dateSearchParam(`2026-2-3`)).toBeUndefined();
    expect(dateSearchParam(`2026-02-29`)).toBeUndefined();
    expect(dateSearchParam(`2026-02-31`)).toBeUndefined();
    expect(dateSearchParam(`2026-04-31`)).toBeUndefined();
    expect(dateSearchParam(`20260401`)).toBeUndefined();
    expect(dateSearchParam(`2026-04-01T00:00:00.000Z`)).toBeUndefined();
  });

  it(`serializes only contract-safe query values`, () => {
    expect(
      buildQueryString({
        q: `  invoice  `,
        empty: `   `,
        amountMin: Number.NaN,
        amountMax: 100,
        defaultSelected: false,
      }),
    ).toBe(`q=invoice&amountMax=100&defaultSelected=false`);
  });
});
