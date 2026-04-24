const DAY_IN_MS = 24 * 60 * 60 * 1000;
const KIBIBYTE = 1024;
const MEBIBYTE = KIBIBYTE * KIBIBYTE;

export const DEFAULT_LOOKBACK_DAYS = 7;

export function formatDateTime(value: string | null | undefined, emptyValue = `-`): string {
  if (!value) {
    return emptyValue;
  }
  return new Date(value).toLocaleString();
}

export function formatBytes(value: number | null | undefined): string {
  const safeValue = value ?? NaN;
  if (!Number.isFinite(safeValue)) {
    return `-`;
  }
  if (safeValue < KIBIBYTE) {
    return `${safeValue} B`;
  }
  if (safeValue < MEBIBYTE) {
    return `${(safeValue / KIBIBYTE).toFixed(1)} KB`;
  }
  return `${(safeValue / MEBIBYTE).toFixed(1)} MB`;
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getDefaultLookbackRange(days = DEFAULT_LOOKBACK_DAYS): { dateFrom: Date; dateTo: Date } {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - days * DAY_IN_MS);
  return { dateFrom, dateTo };
}

export function getDefaultLookbackDateOnlyRange(days = DEFAULT_LOOKBACK_DAYS): {
  dateFrom: string;
  dateTo: string;
} {
  const { dateFrom, dateTo } = getDefaultLookbackRange(days);
  return {
    dateFrom: toDateOnly(dateFrom),
    dateTo: toDateOnly(dateTo),
  };
}

export function getDefaultLookbackIsoRange(days = DEFAULT_LOOKBACK_DAYS): {
  dateFrom: string;
  dateTo: string;
} {
  const { dateFrom, dateTo } = getDefaultLookbackRange(days);
  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}
