import { CurrencyCode } from '@remoola/database';

export const formatCurrency = (
  value: number,
  currency: CurrencyCode = CurrencyCode.USD,
  replaceDoubleZero?: boolean,
) => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const formattedValue = new Intl.NumberFormat(locale, { style: `currency`, currency }).format(value);
  if (replaceDoubleZero) return formattedValue.replace(`.00`, ``);
  return formattedValue;
};
