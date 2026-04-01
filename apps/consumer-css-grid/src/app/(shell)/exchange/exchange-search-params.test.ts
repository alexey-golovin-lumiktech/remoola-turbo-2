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

  it(`clamps invalid values and preserves each list independently`, () => {
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
      scheduledPageSize: 1,
    });
  });
});
