import { type $Enums, Prisma } from '@remoola/database-2';

import { getCurrencyFractionDigits } from '../shared-common';

export type MoneyDecimalInput = Prisma.Decimal | number | string | { toString(): string };

export function toMoneyDecimal(value: MoneyDecimalInput, label = `amount`): Prisma.Decimal {
  try {
    const decimal = new Prisma.Decimal(value.toString());
    if (!decimal.isFinite()) {
      throw new Error(`${label} must be finite`);
    }
    return decimal;
  } catch (error) {
    if (error instanceof Error && error.message === `${label} must be finite`) {
      throw error;
    }
    throw new Error(`${label} must be a valid decimal amount`);
  }
}

export function toPositiveMoneyDecimal(value: MoneyDecimalInput, label = `amount`): Prisma.Decimal {
  const decimal = toMoneyDecimal(value, label);
  if (decimal.lte(0)) {
    throw new Error(`${label} must be positive`);
  }
  return decimal;
}

export function toCanonicalMoneyString(value: MoneyDecimalInput): string {
  return toMoneyDecimal(value).toString();
}

export function moneyDecimalToNumber(value: MoneyDecimalInput): number {
  return toMoneyDecimal(value).toNumber();
}

export function moneyDecimalToStripeMinorUnits(value: MoneyDecimalInput, currency: $Enums.CurrencyCode): number {
  const digits = getCurrencyFractionDigits(currency);
  const factor = new Prisma.Decimal(10).pow(digits);
  const minorUnits = toMoneyDecimal(value).times(factor).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  const result = minorUnits.toNumber();
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error(`Stripe amount must resolve to a positive safe integer`);
  }
  return result;
}
