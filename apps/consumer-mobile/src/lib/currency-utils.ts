/**
 * Currency utilities for normalizing currency data from API
 * Handles both string arrays and object arrays from API responses
 */

export interface Currency {
  code: string;
  symbol: string;
  name?: string;
}

/**
 * Comprehensive currency symbol mapping for 70+ currencies
 */
export const currencySymbols: Record<string, string> = {
  USD: `$`,
  EUR: `€`,
  GBP: `£`,
  JPY: `¥`,
  AUD: `A$`,
  CAD: `C$`,
  CHF: `Fr`,
  CNY: `¥`,
  SEK: `kr`,
  NZD: `NZ$`,
  KRW: `₩`,
  SGD: `S$`,
  NOK: `kr`,
  MXN: `$`,
  INR: `₹`,
  RUB: `₽`,
  ZAR: `R`,
  TRY: `₺`,
  BRL: `R$`,
  TWD: `NT$`,
  DKK: `kr`,
  PLN: `zł`,
  THB: `฿`,
  IDR: `Rp`,
  HUF: `Ft`,
  CZK: `Kč`,
  ILS: `₪`,
  CLP: `$`,
  PHP: `₱`,
  AED: `د.إ`,
  COP: `$`,
  SAR: `﷼`,
  MYR: `RM`,
  RON: `lei`,
  AZN: `₼`,
  AMD: `֏`,
  BYN: `Br`,
  BGN: `лв`,
  VND: `₫`,
  HKD: `HK$`,
  GEL: `₾`,
  EGP: `E£`,
  KZT: `₸`,
  QAR: `ر.ق`,
  KGS: `с`,
  MDL: `L`,
  XDR: `XDR`,
  TJS: `ЅМ`,
  TMT: `m`,
  UZS: `soʻm`,
  UAH: `₴`,
  RSD: `din`,
};

/**
 * Normalizes currency data from API to a consistent format
 *
 * Handles:
 * - Array of strings: ['USD', 'EUR', ...] -> [{code: 'USD', symbol: '$'}, ...]
 * - Array of objects: [{code: 'USD', symbol: '$'}, ...] -> [{code: 'USD', symbol: '$'}, ...]
 * - Mixed or malformed data -> filtered and normalized
 *
 * @param data - Currency data from API (array of strings or objects)
 * @returns Array of Currency objects with code and symbol
 */
export function normalizeCurrencies(data: unknown): Currency[] {
  if (!Array.isArray(data)) {
    return [];
  }

  // Handle array of strings ['USD', 'EUR', ...]
  if (data.length > 0 && typeof data[0] === `string`) {
    return data
      .filter((item): item is string => typeof item === `string` && item.length >= 3)
      .map((code) => ({
        code: code.toUpperCase(),
        symbol: currencySymbols[code.toUpperCase()] || code.slice(0, 1),
      }));
  }

  // Handle array of objects [{code: 'USD', symbol: '$'}, ...]
  return data
    .filter(
      (item): item is { code?: string; symbol?: string; name?: string } =>
        typeof item === `object` && item !== null && (`code` in item || typeof item === `string`),
    )
    .map((item) => {
      const code = typeof item === `string` ? item : item.code || ``;
      return {
        code: code.toUpperCase(),
        symbol: (typeof item === `object` && item.symbol) || currencySymbols[code.toUpperCase()] || code.slice(0, 1),
        name: typeof item === `object` ? item.name : undefined,
      };
    })
    .filter((item) => item.code.length >= 3);
}

/**
 * Get currency symbol for a given currency code
 * @param code - Currency code (e.g., 'USD', 'EUR')
 * @returns Currency symbol (e.g., '$', '€') or first letter of code if not found
 */
export function getCurrencySymbol(code: string): string {
  return currencySymbols[code.toUpperCase()] || code.slice(0, 1);
}
