import { Injectable } from '@nestjs/common';

import {
  assertClassName,
  assertDateRange,
  buildAvailableSummary,
  buildUnavailableSummary,
  mapRowToEntry,
} from './admin-v2-ledger-anomalies-policy';
import {
  type LedgerAnomaliesListParams,
  type LedgerAnomalyClass,
  type LedgerAnomalyClassSummary,
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
} from './admin-v2-ledger-anomalies.dto';
import { AdminV2LedgerAnomaliesQuery } from './admin-v2-ledger-anomalies.query';
import { normalizeLimit } from './admin-v2-ledger-anomaly-mappers';
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
    const validClass = assertClassName(className);
    const parsedFrom = new Date(dateFrom);
    const parsedTo = new Date(dateTo);
    const range = assertDateRange(parsedFrom, parsedTo);
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
    const className = assertClassName(params.className);
    const { dateFrom, dateTo } = assertDateRange(params.dateFrom, params.dateTo);
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
      items: rows.slice(0, limit).map((row) => mapRowToEntry(className, row, computedAt)),
      nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.anomalyAt, id: next.id }) : null,
      computedAt: computedAt.toISOString(),
    };
  }

  private async getSummaryForClass(
    className: Parameters<typeof buildAvailableSummary>[0],
    countFn: () => Promise<number>,
  ): Promise<ReturnType<typeof buildAvailableSummary>> {
    try {
      const count = await countFn();
      return buildAvailableSummary(className, count);
    } catch {
      return buildUnavailableSummary(className);
    }
  }
}
