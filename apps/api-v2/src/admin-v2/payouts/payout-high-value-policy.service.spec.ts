import { afterEach, describe, expect, it } from '@jest/globals';

import { $Enums, Prisma } from '@remoola/database-2';

import { PayoutHighValuePolicyService } from './payout-high-value-policy.service';
import { envs } from '../../envs';

describe(`PayoutHighValuePolicyService`, () => {
  const originalHighValueThresholds = envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS;

  afterEach(() => {
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = originalHighValueThresholds;
  });

  function buildService(thresholds: string) {
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = thresholds;
    return new PayoutHighValuePolicyService();
  }

  it(`returns an unconfigured policy when no thresholds are configured`, () => {
    const service = buildService(``);

    expect(service.getConfig().policy).toEqual({
      availability: `unconfigured`,
      source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
      wording: [
        `High-value payouts appear in this list only when per-currency thresholds are configured.`,
        `No per-currency thresholds are currently configured.`,
      ].join(` `),
      configuredThresholds: [],
    });
    expect(service.assess({ amount: new Prisma.Decimal(`100`), currencyCode: $Enums.CurrencyCode.USD })).toEqual({
      eligibility: `not-configured`,
      thresholdAmount: null,
      thresholdCurrency: $Enums.CurrencyCode.USD,
    });
  });

  it(`returns a partially configured policy when threshold JSON is invalid`, () => {
    const service = buildService(`{bad json`);

    expect(service.getConfig().policy).toEqual({
      availability: `partially-configured`,
      source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
      wording: [
        `High-value payouts cannot be evaluated truthfully`,
        `because the current threshold config is invalid JSON.`,
      ].join(` `),
      configuredThresholds: [],
    });
  });

  it(`ignores unsupported currencies and non-positive thresholds`, () => {
    const service = buildService(JSON.stringify({ USD: `0`, EUR: `-1`, BTC: `1000` }));

    expect(service.getConfig().policy).toEqual({
      availability: `partially-configured`,
      source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
      wording: [
        `High-value payouts are not evaluable`,
        `because the configured threshold map does not contain valid positive per-currency amounts.`,
      ].join(` `),
      configuredThresholds: [],
    });
  });

  it(`parses valid thresholds and assesses absolute payout amounts`, () => {
    const service = buildService(JSON.stringify({ USD: `100`, EUR: `80` }));

    expect(service.getConfig().policy).toEqual({
      availability: `configured`,
      source: `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`,
      wording: [
        `High-value payouts are derived from configured per-currency thresholds.`,
        `Currencies without an explicit threshold remain non-evaluable.`,
      ].join(` `),
      configuredThresholds: [
        { currencyCode: $Enums.CurrencyCode.USD, amount: `100` },
        { currencyCode: $Enums.CurrencyCode.EUR, amount: `80` },
      ],
    });
    expect(service.assess({ amount: new Prisma.Decimal(`-150`), currencyCode: $Enums.CurrencyCode.USD })).toEqual({
      eligibility: `high-value`,
      thresholdAmount: `100`,
      thresholdCurrency: $Enums.CurrencyCode.USD,
    });
    expect(service.assess({ amount: new Prisma.Decimal(`79.99`), currencyCode: $Enums.CurrencyCode.EUR })).toEqual({
      eligibility: `below-threshold`,
      thresholdAmount: `80`,
      thresholdCurrency: $Enums.CurrencyCode.EUR,
    });
    expect(service.assess({ amount: new Prisma.Decimal(`1000`), currencyCode: $Enums.CurrencyCode.JPY })).toEqual({
      eligibility: `not-configured`,
      thresholdAmount: null,
      thresholdCurrency: $Enums.CurrencyCode.JPY,
    });
  });

  it(`caches config for the service instance`, () => {
    const service = buildService(JSON.stringify({ USD: `100` }));
    const first = service.getConfig();
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = JSON.stringify({ USD: `200` });

    expect(service.getConfig()).toBe(first);
    expect(service.assess({ amount: new Prisma.Decimal(`150`), currencyCode: $Enums.CurrencyCode.USD })).toEqual({
      eligibility: `high-value`,
      thresholdAmount: `100`,
      thresholdCurrency: $Enums.CurrencyCode.USD,
    });
  });
});
