const currencyFractionDigitsCache = new Map<string, number>();

export function getCurrencyFractionDigits(currency: string): number {
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

export function roundToCurrency(amount: number, currency: string) {
  const digits = getCurrencyFractionDigits(currency);
  return Number(amount.toFixed(digits));
}

export function formatCurrencyAmount(amount: number, currency: string) {
  const digits = getCurrencyFractionDigits(currency);
  return Number(amount).toFixed(digits);
}

/** Format amount as currency for display (e.g. $1,234.56). Use in lists and detail views. */
export function formatCurrencyDisplay(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, { style: `currency`, currency: currencyCode }).format(amount);
}

/** Format cents as currency for display (e.g. balance in cents → $12.34). */
export function formatCentsToDisplay(cents: number, currencyCode: string): string {
  return formatCurrencyDisplay(cents / 100, currencyCode);
}
