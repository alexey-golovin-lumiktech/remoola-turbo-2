import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { pickDashboardSummaryCurrencyCode } from './consumer-dashboard-currency.policy';

describe(`consumer-dashboard-currency policy`, () => {
  it(`keeps the preferred currency when it has a non-zero balance`, () => {
    expect(
      pickDashboardSummaryCurrencyCode(
        $Enums.CurrencyCode.EUR,
        { [$Enums.CurrencyCode.EUR]: 12.34 },
        { [$Enums.CurrencyCode.USD]: 0 },
      ),
    ).toBe($Enums.CurrencyCode.EUR);
  });

  it(`falls back to the sole non-zero currency when preferred has no balance`, () => {
    expect(
      pickDashboardSummaryCurrencyCode(
        $Enums.CurrencyCode.JPY,
        { [$Enums.CurrencyCode.USD]: 23, [$Enums.CurrencyCode.EUR]: 0 },
        { [$Enums.CurrencyCode.USD]: 16.77 },
      ),
    ).toBe($Enums.CurrencyCode.USD);
  });

  it(`falls back to the preferred currency when every balance is effectively zero`, () => {
    expect(
      pickDashboardSummaryCurrencyCode(
        $Enums.CurrencyCode.GBP,
        { [$Enums.CurrencyCode.USD]: 0.0000001 },
        { [$Enums.CurrencyCode.EUR]: 0 },
      ),
    ).toBe($Enums.CurrencyCode.GBP);
  });

  it(`defaults to USD when multiple currencies are non-zero and preferred is absent or zero`, () => {
    expect(
      pickDashboardSummaryCurrencyCode(null, { [$Enums.CurrencyCode.USD]: 23 }, { [$Enums.CurrencyCode.EUR]: 10.66 }),
    ).toBe($Enums.CurrencyCode.USD);

    expect(
      pickDashboardSummaryCurrencyCode(
        $Enums.CurrencyCode.JPY,
        { [$Enums.CurrencyCode.USD]: 23 },
        { [$Enums.CurrencyCode.EUR]: 10.66 },
      ),
    ).toBe($Enums.CurrencyCode.USD);
  });
});
