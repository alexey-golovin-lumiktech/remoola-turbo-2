import { type $Enums } from '@remoola/database-2';

const currencyFractionDigitsCache = new Map<string, number>();

export function getCurrencyFractionDigits(currency: $Enums.CurrencyCode): number {
  const cached = currencyFractionDigitsCache.get(currency);
  if (cached != null) return cached;

  try {
    const formatter = new Intl.NumberFormat(`en-US`, { style: `currency`, currency });
    const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    currencyFractionDigitsCache.set(currency, digits);
    return digits;
  } catch {
    currencyFractionDigitsCache.set(currency, 2);
    return 2;
  }
}
