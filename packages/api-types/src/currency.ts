/**
 * Currency codes aligned with Prisma CurrencyCode enum.
 * Fintech-safe: used for display and validation; server enforces allowlist per flow.
 */

export const ALL_CURRENCY_CODES = [
  `USD`,
  `EUR`,
  `JPY`,
  `GBP`,
  `AUD`,
  `AZN`,
  `AMD`,
  `BYN`,
  `BGN`,
  `BRL`,
  `HUF`,
  `VND`,
  `HKD`,
  `GEL`,
  `DKK`,
  `AED`,
  `EGP`,
  `INR`,
  `IDR`,
  `KZT`,
  `CAD`,
  `QAR`,
  `KGS`,
  `CNY`,
  `MDL`,
  `NZD`,
  `NOK`,
  `PLN`,
  `RON`,
  `XDR`,
  `SGD`,
  `TJS`,
  `THB`,
  `TRY`,
  `TMT`,
  `UZS`,
  `UAH`,
  `CZK`,
  `SEK`,
  `CHF`,
  `RSD`,
  `ZAR`,
  `KRW`,
  `RUB`,
] as const;

export type TCurrencyCode = (typeof ALL_CURRENCY_CODES)[number];

/** Returns the currency symbol for display (e.g. USD → $, EUR → €). Uses Intl; falls back to code. */
export function getCurrencySymbol(currencyCode: string): string {
  try {
    const parts = new Intl.NumberFormat(`en-US`, {
      style: `currency`,
      currency: currencyCode,
      currencyDisplay: `symbol`,
    }).formatToParts(0);
    const currencyPart = parts.find((p) => p.type === `currency`);
    return currencyPart?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}
