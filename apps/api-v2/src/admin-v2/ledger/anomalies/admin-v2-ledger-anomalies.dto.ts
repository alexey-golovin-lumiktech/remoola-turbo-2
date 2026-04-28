import {
  ADMIN_V2_DEFAULT_ANOMALY_LIMIT,
  ADMIN_V2_DUPLICATE_RISK_WINDOW_DAYS,
  ADMIN_V2_INCONSISTENT_CHAIN_GRACE_MINUTES,
  ADMIN_V2_LARGE_VALUE_THRESHOLDS,
  ADMIN_V2_LEDGER_ANOMALY_CLASSES,
  ADMIN_V2_MAX_ANOMALY_LIMIT,
  ADMIN_V2_MAX_ANOMALY_RANGE_DAYS,
  ADMIN_V2_ORPHANED_ENTRY_GRACE_HOURS,
  ADMIN_V2_STALE_PENDING_HOURS,
  type AdminV2LedgerAnomaliesListParams,
  type AdminV2LedgerAnomalyClass,
  type AdminV2LedgerAnomalyClassSummary,
  type AdminV2LedgerAnomalyEntry,
  type AdminV2LedgerAnomalyListResponse,
  type AdminV2LedgerAnomalySummaryResponse,
} from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

export const STALE_PENDING_HOURS = ADMIN_V2_STALE_PENDING_HOURS;
export const INCONSISTENT_CHAIN_GRACE_MINUTES = ADMIN_V2_INCONSISTENT_CHAIN_GRACE_MINUTES;
export const ORPHANED_ENTRY_GRACE_HOURS = ADMIN_V2_ORPHANED_ENTRY_GRACE_HOURS;
export const DUPLICATE_RISK_WINDOW_DAYS = ADMIN_V2_DUPLICATE_RISK_WINDOW_DAYS;
export const MAX_ANOMALY_RANGE_DAYS = ADMIN_V2_MAX_ANOMALY_RANGE_DAYS;
export const DEFAULT_ANOMALY_LIMIT = ADMIN_V2_DEFAULT_ANOMALY_LIMIT;
export const MAX_ANOMALY_LIMIT = ADMIN_V2_MAX_ANOMALY_LIMIT;
export const TERMINAL_OUTCOME_STATUSES = [
  $Enums.TransactionStatus.COMPLETED,
  $Enums.TransactionStatus.DENIED,
  $Enums.TransactionStatus.UNCOLLECTIBLE,
] as const;

export const LEDGER_ANOMALY_CLASSES = ADMIN_V2_LEDGER_ANOMALY_CLASSES;

export type LedgerAnomalyClass = AdminV2LedgerAnomalyClass;

export type LedgerAnomalyClassSummary = AdminV2LedgerAnomalyClassSummary;

export type LedgerAnomalySummaryResponse = AdminV2LedgerAnomalySummaryResponse;

export type LedgerAnomalyEntry = AdminV2LedgerAnomalyEntry;

export type LedgerAnomalyListResponse = AdminV2LedgerAnomalyListResponse;

export type LedgerAnomaliesListParams = AdminV2LedgerAnomaliesListParams;

export const LARGE_VALUE_THRESHOLDS: Partial<Record<$Enums.CurrencyCode, number>> = ADMIN_V2_LARGE_VALUE_THRESHOLDS;
