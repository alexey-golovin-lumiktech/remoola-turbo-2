import type { $Enums } from '@remoola/database-2';

export const STALE_PENDING_HOURS = 24;
export const INCONSISTENT_CHAIN_GRACE_MINUTES = 60;
export const MAX_ANOMALY_RANGE_DAYS = 30;
export const DEFAULT_ANOMALY_LIMIT = 50;
export const MAX_ANOMALY_LIMIT = 100;

export const LEDGER_ANOMALY_CLASSES = [
  `stalePendingEntries`,
  `inconsistentOutcomeChains`,
  `largeValueOutliers`,
] as const;

export type LedgerAnomalyClass = (typeof LEDGER_ANOMALY_CLASSES)[number];

export type LedgerAnomalyClassSummary = {
  label: string;
  count: number | null;
  phaseStatus: `live-actionable`;
  availability: `available` | `temporarily-unavailable`;
  href: string;
};

export type LedgerAnomalySummaryResponse = {
  computedAt: string;
  classes: Record<LedgerAnomalyClass, LedgerAnomalyClassSummary>;
  totalCount: number | null;
};

export type LedgerAnomalyEntry = {
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
    class: LedgerAnomalyClass;
    detail: string;
  };
};

export type LedgerAnomalyListResponse = {
  class: LedgerAnomalyClass;
  items: LedgerAnomalyEntry[];
  nextCursor: string | null;
  computedAt: string;
};

export type LedgerAnomaliesListParams = {
  className: string;
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: string;
  limit?: number;
};

export const LARGE_VALUE_THRESHOLDS: Partial<Record<$Enums.CurrencyCode, number>> = {
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
