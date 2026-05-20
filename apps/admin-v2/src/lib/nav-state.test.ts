import { describe, expect, it } from '@jest/globals';

import { getActivePathFromHeaders, isNavItemActive, normalizeActivePath } from './nav-state';

describe(`admin-v2 nav state helpers`, () => {
  it(`normalizes full urls and query strings down to pathname`, () => {
    expect(normalizeActivePath(`http://localhost:3000/payments/operations?bucket=overdue`)).toBe(
      `/payments/operations`,
    );
    expect(normalizeActivePath(`/ledger/anomalies?class=stalePendingEntries`)).toBe(`/ledger/anomalies`);
  });

  it(`prefers x-pathname over next-url when deriving active path`, () => {
    const headerStore = {
      get(name: string) {
        if (name === `x-pathname`) {
          return `/payments/operations`;
        }

        if (name === `next-url`) {
          return `http://localhost:3000/overview`;
        }

        return null;
      },
    };

    expect(getActivePathFromHeaders(headerStore)).toBe(`/payments/operations`);
  });

  it(`treats nested routes as active under their parent nav item`, () => {
    expect(isNavItemActive(`/payments`, `/payments/operations`)).toBe(true);
    expect(isNavItemActive(`/ledger`, `/ledger/anomalies`)).toBe(true);
    expect(isNavItemActive(`/payments`, `/payment-methods`)).toBe(false);
  });
});
