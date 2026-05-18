import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { envs } from '../../envs';

const PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE = `env.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS`;

export type PayoutHighValueEligibility = `high-value` | `below-threshold` | `not-configured`;
export type PayoutHighValuePolicyAvailability = `configured` | `partially-configured` | `unconfigured`;

export type PayoutHighValuePolicy = {
  availability: PayoutHighValuePolicyAvailability;
  source: string;
  wording: string;
  configuredThresholds: Array<{
    currencyCode: $Enums.CurrencyCode;
    amount: string;
  }>;
};

export type PayoutHighValueAssessment = {
  eligibility: PayoutHighValueEligibility;
  thresholdAmount: string | null;
  thresholdCurrency: $Enums.CurrencyCode;
};

export type PayoutHighValueConfig = {
  policy: PayoutHighValuePolicy;
  thresholds: Map<$Enums.CurrencyCode, Prisma.Decimal>;
};

@Injectable()
export class PayoutHighValuePolicyService {
  private cachedConfig: PayoutHighValueConfig | null = null;

  getConfig(): PayoutHighValueConfig {
    this.cachedConfig ??= this.parseConfig();
    return this.cachedConfig;
  }

  assess(entry: { amount: Prisma.Decimal; currencyCode: $Enums.CurrencyCode }): PayoutHighValueAssessment {
    const config = this.getConfig();
    const threshold = config.thresholds.get(entry.currencyCode);
    if (!threshold) {
      return {
        eligibility: `not-configured`,
        thresholdAmount: null,
        thresholdCurrency: entry.currencyCode,
      };
    }

    const absoluteAmount = new Prisma.Decimal(entry.amount.toString()).abs();
    return {
      eligibility: absoluteAmount.gte(threshold) ? `high-value` : `below-threshold`,
      thresholdAmount: threshold.toString(),
      thresholdCurrency: entry.currencyCode,
    };
  }

  private parseConfig(): PayoutHighValueConfig {
    const configuredThresholds: Array<{ currencyCode: $Enums.CurrencyCode; amount: string }> = [];
    const thresholds = new Map<$Enums.CurrencyCode, Prisma.Decimal>();
    const raw = envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS.trim();

    if (!raw) {
      return {
        thresholds,
        policy: {
          availability: `unconfigured`,
          source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
          wording: [
            `High-value payouts appear in this list only when per-currency thresholds are configured.`,
            `No per-currency thresholds are currently configured.`,
          ].join(` `),
          configuredThresholds,
        },
      };
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== `object` || Array.isArray(parsed)) {
        throw new Error(`Threshold config must be a JSON object`);
      }

      for (const [currencyCode, amount] of Object.entries(parsed)) {
        if (!Object.values($Enums.CurrencyCode).includes(currencyCode as $Enums.CurrencyCode)) {
          continue;
        }

        const decimalAmount = new Prisma.Decimal(String(amount));
        if (decimalAmount.lte(0)) {
          continue;
        }

        thresholds.set(currencyCode as $Enums.CurrencyCode, decimalAmount);
        configuredThresholds.push({
          currencyCode: currencyCode as $Enums.CurrencyCode,
          amount: decimalAmount.toString(),
        });
      }
    } catch {
      return {
        thresholds,
        policy: {
          availability: `partially-configured`,
          source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
          wording: [
            `High-value payouts cannot be evaluated truthfully`,
            `because the current threshold config is invalid JSON.`,
          ].join(` `),
          configuredThresholds,
        },
      };
    }

    if (configuredThresholds.length === 0) {
      return {
        thresholds,
        policy: {
          availability: `partially-configured`,
          source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
          wording: [
            `High-value payouts are not evaluable`,
            `because the configured threshold map does not contain valid positive per-currency amounts.`,
          ].join(` `),
          configuredThresholds,
        },
      };
    }

    return {
      thresholds,
      policy: {
        availability: `configured`,
        source: PAYOUT_HIGH_VALUE_THRESHOLD_SOURCE,
        wording: [
          `High-value payouts are derived from configured per-currency thresholds.`,
          `Currencies without an explicit threshold remain non-evaluable.`,
        ].join(` `),
        configuredThresholds,
      },
    };
  }
}
