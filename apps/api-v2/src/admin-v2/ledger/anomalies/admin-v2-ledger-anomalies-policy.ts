import { BadRequestException } from '@nestjs/common';

import {
  INCONSISTENT_CHAIN_GRACE_MINUTES,
  MAX_ANOMALY_RANGE_DAYS,
  ORPHANED_ENTRY_GRACE_HOURS,
  STALE_PENDING_HOURS,
  type LedgerAnomalyClass,
  type LedgerAnomalyClassSummary,
  type LedgerAnomalyEntry,
} from './admin-v2-ledger-anomalies.dto';
import { type AnomalyRow } from './admin-v2-ledger-anomalies.query.types';
import {
  CLASS_HREFS,
  CLASS_LABELS,
  formatAbsoluteAmount,
  formatAge,
  formatNumber,
  isLedgerAnomalyClass,
} from './admin-v2-ledger-anomaly-mappers';

export function assertClassName(className: string): LedgerAnomalyClass {
  if (!isLedgerAnomalyClass(className)) {
    throw new BadRequestException(`Unknown ledger anomaly class`);
  }

  return className;
}

export function assertDateRange(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom || Number.isNaN(dateFrom.getTime())) {
    throw new BadRequestException(`dateFrom is required`);
  }

  const safeDateTo = dateTo && !Number.isNaN(dateTo.getTime()) ? dateTo : new Date();
  if (dateFrom.getTime() > safeDateTo.getTime()) {
    throw new BadRequestException(`dateFrom cannot be after dateTo`);
  }

  const maxRangeMs = MAX_ANOMALY_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (safeDateTo.getTime() - dateFrom.getTime() > maxRangeMs) {
    throw new BadRequestException(`range exceeds maximum of 30 days`);
  }

  return { dateFrom, dateTo: safeDateTo };
}

export function buildAvailableSummary(className: LedgerAnomalyClass, count: number): LedgerAnomalyClassSummary {
  return {
    label: CLASS_LABELS[className],
    count,
    phaseStatus: `live-actionable`,
    availability: `available`,
    href: CLASS_HREFS[className],
  };
}

export function buildUnavailableSummary(className: LedgerAnomalyClass): LedgerAnomalyClassSummary {
  return {
    label: CLASS_LABELS[className],
    count: null,
    phaseStatus: `live-actionable`,
    availability: `temporarily-unavailable`,
    href: CLASS_HREFS[className],
  };
}

export function mapRowToEntry(className: LedgerAnomalyClass, row: AnomalyRow, now: Date): LedgerAnomalyEntry {
  const detail =
    className === `stalePendingEntries`
      ? buildStalePendingDetail(row, now)
      : className === `inconsistentOutcomeChains`
        ? buildInconsistentChainDetail(row, now)
        : className === `largeValueOutliers`
          ? buildLargeValueDetail(row)
          : className === `orphanedEntries`
            ? buildOrphanedEntryDetail(row, now)
            : className === `duplicateIdempotencyRisk`
              ? buildDuplicateIdempotencyRiskDetail(row)
              : buildImpossibleTransitionsDetail(row, now);

  return {
    id: row.id,
    ledgerEntryId: row.ledgerEntryId,
    consumerId: row.consumerId,
    type: row.type,
    amount: row.amount.toString(),
    currencyCode: row.currencyCode,
    entryStatus: row.entryStatus,
    outcomeStatus: row.outcomeStatus,
    outcomeAt: row.outcomeAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    signal: {
      class: className,
      detail,
    },
  };
}

export function buildStalePendingDetail(row: AnomalyRow, now: Date) {
  const outcomeAt = row.outcomeAt ?? row.anomalyAt;
  return `Latest outcome ${row.outcomeStatus ?? `UNKNOWN`} since ${outcomeAt.toISOString()} (${formatAge(
    outcomeAt,
    now,
  )} ago, threshold ${STALE_PENDING_HOURS}h)`;
}

export function buildInconsistentChainDetail(row: AnomalyRow, now: Date) {
  const outcomeAt = row.outcomeAt ?? row.anomalyAt;
  return `Persisted status ${row.entryStatus} but latest outcome ${
    row.outcomeStatus ?? `UNKNOWN`
  } since ${outcomeAt.toISOString()} (${formatAge(
    outcomeAt,
    now,
  )} ago, beyond ${INCONSISTENT_CHAIN_GRACE_MINUTES}m sync window)`;
}

export function buildLargeValueDetail(row: AnomalyRow) {
  const threshold = row.threshold ?? 0;
  return `Amount |${formatAbsoluteAmount(row.amount)}| ${
    row.currencyCode
  } exceeds large-value threshold ${formatNumber(threshold)} (USD-equivalent baseline ~10,000)`;
}

export function buildOrphanedEntryDetail(row: AnomalyRow, now: Date) {
  return `Entry created ${row.createdAt.toISOString()} (${formatAge(
    row.createdAt,
    now,
  )} ago) has no outcome record (grace ${ORPHANED_ENTRY_GRACE_HOURS}h)`;
}

export function buildDuplicateIdempotencyRiskDetail(row: AnomalyRow) {
  return `Entry created ${row.createdAt.toISOString()} carries stripeId ${
    row.stripeId ?? `UNKNOWN`
  } but no idempotency key (Stripe-source writes must be idempotent)`;
}

export function buildImpossibleTransitionsDetail(row: AnomalyRow, now: Date) {
  const violationAt = row.anomalyAt;
  return `Outcome chain has transition ${row.prevStatus ?? `UNKNOWN`} → ${
    row.nextStatus ?? row.outcomeStatus ?? `UNKNOWN`
  } at ${violationAt.toISOString()} (${formatAge(
    violationAt,
    now,
  )} ago); ${row.prevStatus ?? `UNKNOWN`} is terminal and must not be followed`;
}
