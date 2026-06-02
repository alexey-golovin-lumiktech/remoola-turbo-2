import { $Enums } from '@remoola/database-2';

const DASHBOARD_BALANCE_EPSILON = 0.000001;

export function pickDashboardSummaryCurrencyCode(
  preferredCurrency: $Enums.CurrencyCode | null | undefined,
  ...balanceMaps: Array<Partial<Record<$Enums.CurrencyCode, number>>>
): $Enums.CurrencyCode {
  const hasNonZeroBalance = (currency: $Enums.CurrencyCode) =>
    balanceMaps.some((balanceMap) => Math.abs(balanceMap[currency] ?? 0) > DASHBOARD_BALANCE_EPSILON);

  if (preferredCurrency && hasNonZeroBalance(preferredCurrency)) {
    return preferredCurrency;
  }

  const nonZeroCurrencies = new Set<$Enums.CurrencyCode>();
  for (const balanceMap of balanceMaps) {
    for (const [currency, balance] of Object.entries(balanceMap)) {
      if (Math.abs(balance ?? 0) > DASHBOARD_BALANCE_EPSILON) {
        nonZeroCurrencies.add(currency as $Enums.CurrencyCode);
      }
    }
  }

  if (nonZeroCurrencies.size === 1) {
    return [...nonZeroCurrencies][0];
  }

  if (preferredCurrency && nonZeroCurrencies.size === 0) {
    return preferredCurrency;
  }

  return $Enums.CurrencyCode.USD;
}
