import {
  type ExchangeCurrency,
  type ExchangeRateCard,
  type ExchangeRule,
  type ScheduledConversion,
} from '../../../lib/consumer-api.server';

export type Currency = ExchangeCurrency;
export type ExchangeRate = ExchangeRateCard;
export type { ExchangeRule, ScheduledConversion };

export type ExchangeMutationResult =
  | { ok: true; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export type ExchangeMessage = { type: `error` | `success`; text: string };

export type CreateRuleData = {
  from: string;
  to: string;
  targetBalance: string;
  maxConvertAmount: string;
  minIntervalMinutes: string;
  enabled: boolean;
};

export type UpdateRuleData = {
  from?: string;
  to?: string;
  targetBalance?: string;
  maxConvertAmount?: string;
  minIntervalMinutes?: string;
  enabled?: boolean;
};

export type ScheduleData = {
  from: string;
  to: string;
  amount: string;
  executeAt: string;
};

const FALLBACK_CURRENCIES: Currency[] = [
  { code: `USD`, symbol: `$` },
  { code: `EUR`, symbol: `E` },
];

export function getExchangeCurrencyOptions(currencies: Currency[]) {
  return currencies.length > 0 ? currencies : FALLBACK_CURRENCIES;
}

export function pickTopCurrencies(codes: string[]) {
  const preferred = [`USD`, `EUR`, `GBP`];
  const available = preferred.filter((code) => codes.includes(code));
  if (available.length >= 2) return available;
  return codes.slice(0, 3);
}

export function buildInitialRatePairs(fromCurrency: string, toCurrency: string, thirdCurrency?: string) {
  const pairs = [
    { from: fromCurrency, to: toCurrency },
    { from: toCurrency, to: fromCurrency },
  ];

  if (thirdCurrency && thirdCurrency !== fromCurrency && thirdCurrency !== toCurrency) {
    pairs.push({ from: fromCurrency, to: thirdCurrency });
  }

  return pairs;
}

export function buildExchangePaginationHref(pathname: string, searchParams: string, patch: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(patch)) {
    params.set(key, value);
  }
  return `${pathname}?${params.toString()}`;
}

export function formatMinorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount / 100);
}

export function formatMajorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function formatScheduleStatus(status: string) {
  switch (status) {
    case `PENDING`:
      return {
        label: `Pending`,
        className: `text-[var(--app-warning-text)] border-transparent bg-[var(--app-warning-soft)]`,
      };
    case `CANCELLED`:
      return {
        label: `Cancelled`,
        className: `text-[var(--app-text-soft)] border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
      };
    case `EXECUTED`:
      return {
        label: `Executed`,
        className: `text-[var(--app-success-text)] border-transparent bg-[var(--app-success-soft)]`,
      };
    case `FAILED`:
      return {
        label: `Failed`,
        className: `text-[var(--app-danger-text)] border-transparent bg-[var(--app-danger-soft)]`,
      };
    case `PROCESSING`:
      return {
        label: `Processing`,
        className: `text-[var(--app-primary)] border-transparent bg-[var(--app-primary-soft)]`,
      };
    default:
      return {
        label: status,
        className: `text-[var(--app-text-soft)] border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
      };
  }
}

function formatRelativeExecution(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes <= 0) return `Due now`;
  if (diffMinutes < 60) return `In ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `In ${diffHours} hr`;
  const diffDays = Math.round(diffHours / 24);
  return `In ${diffDays} day${diffDays === 1 ? `` : `s`}`;
}

export function formatScheduledSecondaryStatus(status: string, executeAt: string) {
  switch (status) {
    case `PENDING`:
      return formatRelativeExecution(executeAt);
    case `CANCELLED`:
      return `Will not execute`;
    case `EXECUTED`:
      return `Executed from scheduled request`;
    case `FAILED`:
      return `Execution attempt failed`;
    case `PROCESSING`:
      return `Execution in progress`;
    default:
      return `Status updated`;
  }
}

export function FieldHint({ message, tone = `muted` }: { message: string; tone?: `muted` | `error` }) {
  return (
    <div
      className={`mt-2 text-xs ${tone === `error` ? `text-[var(--app-danger-text)]` : `text-[var(--app-text-faint)]`}`}
    >
      {message}
    </div>
  );
}
