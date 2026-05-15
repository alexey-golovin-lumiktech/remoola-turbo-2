import { BadRequestException, Injectable } from '@nestjs/common';

import {
  INCONSISTENT_CHAIN_GRACE_MINUTES,
  MAX_ANOMALY_RANGE_DAYS,
  ORPHANED_ENTRY_GRACE_HOURS,
  STALE_PENDING_HOURS,
  type LedgerAnomaliesListParams,
  type LedgerAnomalyClass,
  type LedgerAnomalyClassSummary,
  type LedgerAnomalyEntry,
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
} from './admin-v2-ledger-anomalies.dto';
import { AdminV2LedgerAnomaliesQuery } from './admin-v2-ledger-anomalies.query';
import { AnomalyRow } from './admin-v2-ledger-anomalies.query.types';
import {
  CLASS_HREFS,
  CLASS_LABELS,
  formatAbsoluteAmount,
  formatAge,
  formatNumber,
  isLedgerAnomalyClass,
  normalizeLimit,
} from './admin-v2-ledger-anomaly-mappers';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../../admin-v2-cursor';

@Injectable()
export class AdminV2LedgerAnomaliesService {
  constructor(private readonly query: AdminV2LedgerAnomaliesQuery) {}

  async getSummary(): Promise<LedgerAnomalySummaryResponse> {
    const computedAt = new Date();
    const [
      stalePendingEntries,
      inconsistentOutcomeChains,
      largeValueOutliers,
      orphanedEntries,
      duplicateIdempotencyRisk,
      impossibleTransitions,
    ] = await Promise.all([
      this.getSummaryForClass(`stalePendingEntries`, () => this.query.countStalePendingEntries(computedAt)),
      this.getSummaryForClass(`inconsistentOutcomeChains`, () => this.query.countInconsistentOutcomeChains(computedAt)),
      this.getSummaryForClass(`largeValueOutliers`, () => this.query.countLargeValueOutliers(computedAt)),
      this.getSummaryForClass(`orphanedEntries`, () => this.query.countOrphanedEntries(computedAt)),
      this.getSummaryForClass(`duplicateIdempotencyRisk`, () => this.query.countDuplicateIdempotencyRisk(computedAt)),
      this.getSummaryForClass(`impossibleTransitions`, () => this.query.countImpossibleTransitions(computedAt)),
    ]);
    const classes = {
      stalePendingEntries,
      inconsistentOutcomeChains,
      largeValueOutliers,
      orphanedEntries,
      duplicateIdempotencyRisk,
      impossibleTransitions,
    } satisfies Record<LedgerAnomalyClass, LedgerAnomalyClassSummary>;
    const availableCounts = Object.values(classes)
      .filter((entry) => entry.availability === `available`)
      .map((entry) => entry.count ?? 0);

    return {
      computedAt: computedAt.toISOString(),
      classes,
      totalCount: availableCounts.length > 0 ? availableCounts.reduce((sum, count) => sum + count, 0) : null,
    };
  }

  async getCount(className: LedgerAnomalyClass, dateFrom: string, dateTo: string): Promise<number> {
    const validClass = this.assertClassName(className);
    const parsedFrom = new Date(dateFrom);
    const parsedTo = new Date(dateTo);
    const range = this.assertDateRange(parsedFrom, parsedTo);
    const computedAt = new Date();

    if (validClass === `stalePendingEntries`) {
      return this.query.countStalePendingEntriesForRange(range.dateFrom, range.dateTo, computedAt);
    }
    if (validClass === `inconsistentOutcomeChains`) {
      return this.query.countInconsistentOutcomeChainsForRange(range.dateFrom, range.dateTo, computedAt);
    }
    if (validClass === `largeValueOutliers`) {
      return this.query.countLargeValueOutliersForRange(range.dateFrom, range.dateTo);
    }
    if (validClass === `orphanedEntries`) {
      return this.query.countOrphanedEntriesForRange(range.dateFrom, range.dateTo, computedAt);
    }
    if (validClass === `duplicateIdempotencyRisk`) {
      return this.query.countDuplicateIdempotencyRiskForRange(range.dateFrom, range.dateTo);
    }
    return this.query.countImpossibleTransitionsForRange(range.dateFrom, range.dateTo);
  }

  async getList(params: LedgerAnomaliesListParams): Promise<LedgerAnomalyListResponse> {
    const className = this.assertClassName(params.className);
    const { dateFrom, dateTo } = this.assertDateRange(params.dateFrom, params.dateTo);
    const limit = normalizeLimit(params.limit);
    const cursor = decodeAdminV2Cursor(params.cursor);
    const computedAt = new Date();
    const rows =
      className === `stalePendingEntries`
        ? await this.query.listStalePendingEntries({ dateFrom, dateTo, limit, cursor }, computedAt)
        : className === `inconsistentOutcomeChains`
          ? await this.query.listInconsistentOutcomeChains({ dateFrom, dateTo, limit, cursor }, computedAt)
          : className === `largeValueOutliers`
            ? await this.query.listLargeValueOutliers({ dateFrom, dateTo, limit, cursor })
            : className === `orphanedEntries`
              ? await this.query.listOrphanedEntries({ dateFrom, dateTo, limit, cursor }, computedAt)
              : className === `duplicateIdempotencyRisk`
                ? await this.query.listDuplicateIdempotencyRisk({ dateFrom, dateTo, limit, cursor })
                : await this.query.listImpossibleTransitions({ dateFrom, dateTo, limit, cursor });
    const next = rows[limit];

    return {
      class: className,
      items: rows.slice(0, limit).map((row) => this.mapRowToEntry(className, row, computedAt)),
      nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.anomalyAt, id: next.id }) : null,
      computedAt: computedAt.toISOString(),
    };
  }

  private assertClassName(className: string): LedgerAnomalyClass {
    if (!isLedgerAnomalyClass(className)) {
      throw new BadRequestException(`Unknown ledger anomaly class`);
    }

    return className;
  }

  private assertDateRange(dateFrom?: Date, dateTo?: Date) {
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

  private async getSummaryForClass(
    className: LedgerAnomalyClass,
    countFn: () => Promise<number>,
  ): Promise<LedgerAnomalyClassSummary> {
    try {
      const count = await countFn();
      return {
        label: CLASS_LABELS[className],
        count,
        phaseStatus: `live-actionable`,
        availability: `available`,
        href: CLASS_HREFS[className],
      };
    } catch {
      return this.getUnavailableSummary(className);
    }
  }

  private mapRowToEntry(className: LedgerAnomalyClass, row: AnomalyRow, now: Date): LedgerAnomalyEntry {
    const detail =
      className === `stalePendingEntries`
        ? this.buildStalePendingDetail(row, now)
        : className === `inconsistentOutcomeChains`
          ? this.buildInconsistentChainDetail(row, now)
          : className === `largeValueOutliers`
            ? this.buildLargeValueDetail(row)
            : className === `orphanedEntries`
              ? this.buildOrphanedEntryDetail(row, now)
              : className === `duplicateIdempotencyRisk`
                ? this.buildDuplicateIdempotencyRiskDetail(row)
                : this.buildImpossibleTransitionsDetail(row, now);

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

  private buildStalePendingDetail(row: AnomalyRow, now: Date) {
    const outcomeAt = row.outcomeAt ?? row.anomalyAt;
    return `Latest outcome ${row.outcomeStatus ?? `UNKNOWN`} since ${outcomeAt.toISOString()} (${formatAge(
      outcomeAt,
      now,
    )} ago, threshold ${STALE_PENDING_HOURS}h)`;
  }

  private buildInconsistentChainDetail(row: AnomalyRow, now: Date) {
    const outcomeAt = row.outcomeAt ?? row.anomalyAt;
    return `Persisted status ${row.entryStatus} but latest outcome ${
      row.outcomeStatus ?? `UNKNOWN`
    } since ${outcomeAt.toISOString()} (${formatAge(
      outcomeAt,
      now,
    )} ago, beyond ${INCONSISTENT_CHAIN_GRACE_MINUTES}m sync window)`;
  }

  private buildLargeValueDetail(row: AnomalyRow) {
    const threshold = row.threshold ?? 0;
    return `Amount |${formatAbsoluteAmount(row.amount)}| ${
      row.currencyCode
    } exceeds large-value threshold ${formatNumber(threshold)} (USD-equivalent baseline ~10,000)`;
  }

  private buildOrphanedEntryDetail(row: AnomalyRow, now: Date) {
    return `Entry created ${row.createdAt.toISOString()} (${formatAge(
      row.createdAt,
      now,
    )} ago) has no outcome record (grace ${ORPHANED_ENTRY_GRACE_HOURS}h)`;
  }

  private buildDuplicateIdempotencyRiskDetail(row: AnomalyRow) {
    return `Entry created ${row.createdAt.toISOString()} carries stripeId ${
      row.stripeId ?? `UNKNOWN`
    } but no idempotency key (Stripe-source writes must be idempotent)`;
  }

  private buildImpossibleTransitionsDetail(row: AnomalyRow, now: Date) {
    const violationAt = row.anomalyAt;
    return `Outcome chain has transition ${row.prevStatus ?? `UNKNOWN`} → ${
      row.nextStatus ?? row.outcomeStatus ?? `UNKNOWN`
    } at ${violationAt.toISOString()} (${formatAge(
      violationAt,
      now,
    )} ago); ${row.prevStatus ?? `UNKNOWN`} is terminal and must not be followed`;
  }

  private getUnavailableSummary(className: LedgerAnomalyClass): LedgerAnomalyClassSummary {
    return {
      label: CLASS_LABELS[className],
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: CLASS_HREFS[className],
    };
  }
}
