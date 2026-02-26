import { CURRENCY_CODE, type TCurrencyCode } from '@remoola/api-types';

/** Format amount string as currency for display (admin dashboard). */
export function formatAmount(amount: string, currency: TCurrencyCode = CURRENCY_CODE.USD): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency,
  }).format(num);
}
