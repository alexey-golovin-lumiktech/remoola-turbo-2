import { describe, expect, it } from '@jest/globals';

import { parseListPagination } from './pagination';

describe(`consumer list pagination helpers`, () => {
  it(`floors positive decimals and caps page size`, () => {
    expect(parseListPagination({ page: `2.9`, pageSize: `1000000000` }, { pageSize: 20 })).toEqual({
      page: 2,
      pageSize: 100,
    });
  });

  it.each([`Infinity`, `NaN`, `0`, `-5`, `not-a-number`])(`falls back for invalid pageSize value %s`, (pageSize) => {
    expect(parseListPagination({ pageSize }, { pageSize: 20 })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});
