import { type Prisma } from '@remoola/database-2';

import {
  DEFAULT_ANOMALY_LIMIT,
  LEDGER_ANOMALY_CLASSES,
  MAX_ANOMALY_LIMIT,
  type LedgerAnomalyClass,
} from './admin-v2-ledger-anomalies.dto';

export const CLASS_LABELS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `Stale pending entries`,
  inconsistentOutcomeChains: `Inconsistent outcome chains`,
  largeValueOutliers: `Large value outliers`,
  orphanedEntries: `Orphaned entries`,
  duplicateIdempotencyRisk: `Duplicate idempotency risk`,
  impossibleTransitions: `Impossible transitions`,
};

export const CLASS_HREFS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `/ledger/anomalies?class=stalePendingEntries`,
  inconsistentOutcomeChains: `/ledger/anomalies?class=inconsistentOutcomeChains`,
  largeValueOutliers: `/ledger/anomalies?class=largeValueOutliers`,
  orphanedEntries: `/ledger/anomalies?class=orphanedEntries`,
  duplicateIdempotencyRisk: `/ledger/anomalies?class=duplicateIdempotencyRisk`,
  impossibleTransitions: `/ledger/anomalies?class=impossibleTransitions`,
};

export function isLedgerAnomalyClass(value: string): value is LedgerAnomalyClass {
  return (LEDGER_ANOMALY_CLASSES as readonly string[]).includes(value);
}

export function normalizeLimit(limit?: number) {
  return Math.min(MAX_ANOMALY_LIMIT, Math.max(1, limit ?? DEFAULT_ANOMALY_LIMIT));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(`en-US`).format(value);
}

export function formatAge(from: Date, now: Date) {
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const hoursRemainder = totalHours % 24;
  return hoursRemainder === 0 ? `${days}d` : `${days}d ${hoursRemainder}h`;
}

export function formatAbsoluteAmount(amount: Prisma.Decimal) {
  const raw = amount.toString();
  return raw.startsWith(`-`) ? raw.slice(1) : raw;
}
