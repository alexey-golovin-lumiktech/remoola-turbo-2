import { type $Enums } from '@remoola/database-2';

export const ADMIN_V2_STALE_PENDING_HOURS = 24;
export const ADMIN_V2_INCONSISTENT_CHAIN_GRACE_MINUTES = 60;
export const ADMIN_V2_ORPHANED_ENTRY_GRACE_HOURS = 1;
export const ADMIN_V2_DUPLICATE_RISK_WINDOW_DAYS = 30;
export const ADMIN_V2_MAX_ANOMALY_RANGE_DAYS = 30;
export const ADMIN_V2_DEFAULT_ANOMALY_LIMIT = 50;
export const ADMIN_V2_MAX_ANOMALY_LIMIT = 100;

export const ADMIN_V2_LEDGER_ANOMALY_CLASSES = [
  `stalePendingEntries`,
  `inconsistentOutcomeChains`,
  `largeValueOutliers`,
  `orphanedEntries`,
  `duplicateIdempotencyRisk`,
  `impossibleTransitions`,
] as const;

export type AdminV2LedgerAnomalyClass = (typeof ADMIN_V2_LEDGER_ANOMALY_CLASSES)[number];

export type AdminV2LedgerAnomalyClassSummary = {
  label: string;
  count: number | null;
  phaseStatus: `live-actionable`;
  availability: `available` | `temporarily-unavailable`;
  href: string;
};

export type AdminV2LedgerAnomalySummaryResponse = {
  computedAt: string;
  classes: Record<AdminV2LedgerAnomalyClass, AdminV2LedgerAnomalyClassSummary>;
  totalCount: number | null;
};

export type AdminV2LedgerAnomalyEntry = {
  id: string;
  ledgerEntryId: string;
  consumerId: string;
  type: string;
  amount: string;
  currencyCode: string;
  entryStatus: string;
  outcomeStatus: string | null;
  outcomeAt: string | null;
  createdAt: string;
  updatedAt: string;
  signal: {
    class: AdminV2LedgerAnomalyClass;
    detail: string;
  };
};

export type AdminV2LedgerAnomalyListResponse = {
  class: AdminV2LedgerAnomalyClass;
  items: AdminV2LedgerAnomalyEntry[];
  nextCursor: string | null;
  computedAt: string;
};

export type AdminV2LedgerAnomaliesListParams = {
  className: string;
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: string;
  limit?: number;
};

export const ADMIN_V2_LARGE_VALUE_THRESHOLDS: Partial<Record<$Enums.CurrencyCode, number>> = {
  USD: 10_000,
  EUR: 10_000,
  GBP: 10_000,
  CHF: 10_000,
  CAD: 14_000,
  AUD: 15_000,
  NZD: 16_500,
  SGD: 13_500,
  HKD: 78_000,
  JPY: 1_500_000,
  CNY: 70_000,
};

function isAdminV2LedgerAnomalyClass(value: string): value is AdminV2LedgerAnomalyClass {
  return (ADMIN_V2_LEDGER_ANOMALY_CLASSES as readonly string[]).includes(value);
}
