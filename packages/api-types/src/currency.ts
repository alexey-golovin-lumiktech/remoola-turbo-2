/**
 * Currency codes aligned with Prisma CurrencyCode enum.
 * Fintech-safe: used for display and validation; server enforces allowlist per flow.
 */

export const CURRENCY_CODE = {
  USD: `USD`,
  EUR: `EUR`,
  JPY: `JPY`,
  GBP: `GBP`,
  AUD: `AUD`,
  AZN: `AZN`,
  AMD: `AMD`,
  BYN: `BYN`,
  BGN: `BGN`,
  BRL: `BRL`,
  HUF: `HUF`,
  VND: `VND`,
  HKD: `HKD`,
  GEL: `GEL`,
  DKK: `DKK`,
  AED: `AED`,
  EGP: `EGP`,
  INR: `INR`,
  IDR: `IDR`,
  KZT: `KZT`,
  CAD: `CAD`,
  QAR: `QAR`,
  KGS: `KGS`,
  CNY: `CNY`,
  MDL: `MDL`,
  NZD: `NZD`,
  NOK: `NOK`,
  PLN: `PLN`,
  RON: `RON`,
  XDR: `XDR`,
  SGD: `SGD`,
  TJS: `TJS`,
  THB: `THB`,
  TRY: `TRY`,
  TMT: `TMT`,
  UZS: `UZS`,
  UAH: `UAH`,
  CZK: `CZK`,
  SEK: `SEK`,
  CHF: `CHF`,
  RSD: `RSD`,
  ZAR: `ZAR`,
  KRW: `KRW`,
  RUB: `RUB`,
} as const;

export const CURRENCY_CODES = [
  CURRENCY_CODE.USD,
  CURRENCY_CODE.EUR,
  CURRENCY_CODE.JPY,
  CURRENCY_CODE.GBP,
  CURRENCY_CODE.AUD,
  CURRENCY_CODE.AZN,
  CURRENCY_CODE.AMD,
  CURRENCY_CODE.BYN,
  CURRENCY_CODE.BGN,
  CURRENCY_CODE.BRL,
  CURRENCY_CODE.HUF,
  CURRENCY_CODE.VND,
  CURRENCY_CODE.HKD,
  CURRENCY_CODE.GEL,
  CURRENCY_CODE.DKK,
  CURRENCY_CODE.AED,
  CURRENCY_CODE.EGP,
  CURRENCY_CODE.INR,
  CURRENCY_CODE.IDR,
  CURRENCY_CODE.KZT,
  CURRENCY_CODE.CAD,
  CURRENCY_CODE.QAR,
  CURRENCY_CODE.KGS,
  CURRENCY_CODE.CNY,
  CURRENCY_CODE.MDL,
  CURRENCY_CODE.NZD,
  CURRENCY_CODE.NOK,
  CURRENCY_CODE.PLN,
  CURRENCY_CODE.RON,
  CURRENCY_CODE.XDR,
  CURRENCY_CODE.SGD,
  CURRENCY_CODE.TJS,
  CURRENCY_CODE.THB,
  CURRENCY_CODE.TRY,
  CURRENCY_CODE.TMT,
  CURRENCY_CODE.UZS,
  CURRENCY_CODE.UAH,
  CURRENCY_CODE.CZK,
  CURRENCY_CODE.SEK,
  CURRENCY_CODE.CHF,
  CURRENCY_CODE.RSD,
  CURRENCY_CODE.ZAR,
  CURRENCY_CODE.KRW,
  CURRENCY_CODE.RUB,
] as const;

export type TCurrencyCode = (typeof CURRENCY_CODE)[keyof typeof CURRENCY_CODE];

export function isCurrencyCode(value: string): value is TCurrencyCode {
  return CURRENCY_CODES.includes(value as TCurrencyCode);
}

export function isCurrencyDefinedAndValid(value: string | undefined | null): value is TCurrencyCode {
  return !!value && isCurrencyCode(value);
}

export function toCurrencyOrUndefined(value: string | undefined | null): TCurrencyCode | undefined {
  return value && isCurrencyCode(value) ? value : undefined;
}

export function toCurrencyOrNull(value: string | undefined | null): TCurrencyCode | null {
  return value && isCurrencyCode(value) ? value : null;
}

export function toCurrencyOrDefault(value: string | undefined | null, defaultValue: TCurrencyCode): TCurrencyCode {
  return value && isCurrencyCode(value) ? value : defaultValue;
}

export function toCurrencyOrThrow(value: string | undefined | null): TCurrencyCode {
  if (value && isCurrencyCode(value)) return value;
  throw new Error(`Invalid currency code: ${value}`);
}

export function toCurrency(value: string): TCurrencyCode | never {
  if (isCurrencyCode(value)) return value;
  throw new Error(`Invalid currency code: ${value}`);
}

/** Returns the currency symbol for display (e.g. USD → $, EUR → €). Uses Intl; falls back to code. */
export function getCurrencySymbol(currencyCode: TCurrencyCode): string {
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
