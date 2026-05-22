import { describe, expect, it } from '@jest/globals';

import { EXCHANGE_PAGE_SIZE_DEFAULT, parseExchangePaginationParams } from './exchange-search-params';

describe(`parseExchangePaginationParams`, () => {
  it(`uses independent defaults for rules and scheduled lists`, () => {
    expect(parseExchangePaginationParams()).toEqual({
      rulesPage: 1,
      rulesPageSize: EXCHANGE_PAGE_SIZE_DEFAULT,
      scheduledPage: 1,
      scheduledPageSize: EXCHANGE_PAGE_SIZE_DEFAULT,
    });
  });

  it(`falls back for invalid values and preserves each list independently`, () => {
    expect(
      parseExchangePaginationParams({
        rulesPage: `3`,
        rulesPageSize: `25`,
        scheduledPage: `0`,
        scheduledPageSize: `-10`,
      }),
    ).toEqual({
      rulesPage: 3,
      rulesPageSize: 25,
      scheduledPage: 1,
      scheduledPageSize: EXCHANGE_PAGE_SIZE_DEFAULT,
    });
  });

  it(`floors decimals and caps oversized page sizes`, () => {
    expect(
      parseExchangePaginationParams({
        rulesPage: `2.9`,
        rulesPageSize: `1000000000`,
        scheduledPage: `Infinity`,
        scheduledPageSize: `NaN`,
      }),
    ).toEqual({
      rulesPage: 2,
      rulesPageSize: 100,
      scheduledPage: 1,
      scheduledPageSize: EXCHANGE_PAGE_SIZE_DEFAULT,
    });
  });
});
