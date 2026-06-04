const DAY_IN_MS = 24 * 60 * 60 * 1000;
const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export const DEFAULT_LOOKBACK_DAYS = 7;

const ADMIN_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: `medium`,
  timeZone: `UTC`,
};

const ADMIN_DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: `medium`,
  timeStyle: `short`,
  timeZone: `UTC`,
};

export const EMPTY_VALUE = `—` as const;

export function formatDate(value: unknown): string {
  if (typeof value !== `string` || !value) return EMPTY_VALUE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY_VALUE : date.toLocaleString(undefined, ADMIN_DATE_FORMAT_OPTIONS);
}

export function formatDateTime(value: unknown): string {
  if (typeof value !== `string` || !value) return EMPTY_VALUE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY_VALUE : date.toLocaleString(undefined, ADMIN_DATE_TIME_FORMAT_OPTIONS);
}

export function formatBytes(value: number | null | undefined): string {
  const safeValue = value ?? NaN;
  if (!Number.isFinite(safeValue)) {
    return EMPTY_VALUE;
  }
  if (safeValue < KILOBYTE) {
    return `${safeValue} B`;
  }
  if (safeValue < MEGABYTE) {
    return `${(safeValue / KILOBYTE).toFixed(1)} KB`;
  }
  return `${(safeValue / MEGABYTE).toFixed(1)} MB`;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getDefaultLookbackRange(days = DEFAULT_LOOKBACK_DAYS): { dateFrom: Date; dateTo: Date } {
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
