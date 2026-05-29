import { describe, expect, it } from '@jest/globals';

import { applyExchangeConvertFormPatch, buildExchangeConvertState } from './exchange-convert-state';

describe(`exchange-convert-state`, () => {
  it(`derives convert-form validity and insufficient funds state`, () => {
    const state = buildExchangeConvertState({
      balances: { USD: 10_000 },
      currencies: [
        { code: `USD`, symbol: `$` },
        { code: `EUR`, symbol: `E` },
      ],
      convertForm: {
        from: `USD`,
        to: `EUR`,
        amount: `200`,
      },
    });

    expect(state.convertFormValid).toBe(true);
    expect(state.convertHasInsufficientFunds).toBe(true);
  });

  it(`applies convert form patches without changing unrelated fields`, () => {
    expect(
      applyExchangeConvertFormPatch(
        { from: `USD`, to: `EUR`, amount: `10` },
        {
          amount: `25`,
        },
      ),
    ).toEqual({
      from: `USD`,
      to: `EUR`,
      amount: `25`,
    });
  });
});
