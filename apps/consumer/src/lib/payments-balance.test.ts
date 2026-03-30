import { describe, expect, it } from '@jest/globals';

import { parseBalanceMapResponse } from './payments-balance';

describe(`parseBalanceMapResponse`, () => {
  it(`keeps record payload balances unchanged`, () => {
    expect(parseBalanceMapResponse({ USD: 12.34, EUR: 56.78 })).toEqual({
      balances: { USD: 12.34, EUR: 56.78 },
      parsed: true,
    });
  });

  it(`normalizes array payload amountCents into major units`, () => {
    expect(
      parseBalanceMapResponse([
        { currency: `USD`, amountCents: 1234 },
        { currencyCode: `EUR`, amountCents: `5678` },
      ]),
    ).toEqual({
      balances: { USD: 12.34, EUR: 56.78 },
      parsed: true,
    });
  });

  it(`normalizes items payload amount into major units when already provided`, () => {
    expect(
      parseBalanceMapResponse({
        items: [
          { currency: `USD`, amount: 12.34 },
          { currencyCode: `EUR`, amount: `56.78` },
        ],
      }),
    ).toEqual({
      balances: { USD: 12.34, EUR: 56.78 },
      parsed: true,
    });
  });
});
