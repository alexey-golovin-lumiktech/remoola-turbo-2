import { type LedgerAnomalyClass, type LedgerAnomalyListResponse } from '../../../../lib/admin-api/types';
import { getDefaultLookbackDateOnlyRange } from '../../../../lib/admin-format';
import { isLedgerAnomalyClass } from '../../../../lib/admin-surface-meta';

export const SAVED_VIEW_WORKSPACE = `ledger_anomalies` as const;

export type LedgerAnomaliesSavedViewPayload = {
  class: LedgerAnomalyClass;
  dateFrom: string;
  dateTo: string;
};

export type BuildHrefFn = (next: {
  className?: LedgerAnomalyClass;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string | null;
}) => string;

export type LedgerAnomalyItem = LedgerAnomalyListResponse[`items`][number];

function isYyyyMmDd(value: unknown): value is string {
  return typeof value === `string` && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseSavedViewPayload(raw: unknown): LedgerAnomaliesSavedViewPayload | null {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (!isLedgerAnomalyClass(typeof candidate.class === `string` ? candidate.class : undefined)) {
    return null;
  }
  if (!isYyyyMmDd(candidate.dateFrom) || !isYyyyMmDd(candidate.dateTo)) {
    return null;
  }
  return {
    class: candidate.class as LedgerAnomalyClass,
    dateFrom: candidate.dateFrom,
    dateTo: candidate.dateTo,
  };
}

export function defaultDateRange() {
  return getDefaultLookbackDateOnlyRange();
}

export function formatStateLabel(value: string | null | undefined): string {
  if (!value || value === `live-actionable`) return `Action ready`;
  if (value === `count-only`) return `Read-only`;
  if (value === `deferred`) return `Deferred`;
  return value.replaceAll(`-`, ` `);
}
