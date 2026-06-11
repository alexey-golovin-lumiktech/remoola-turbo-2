import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import {
  SUMMARY_OUTLIER_WINDOW_DAYS,
  type CountRow,
  buildDuplicateIdempotencyRiskPredicateSql,
  buildImpossibleTransitionCountLateralSql,
  buildImpossibleTransitionListLateralSql,
  buildImpossibleTransitionRangeCountLateralSql,
  buildLargeValueThresholdLateralSql,
  buildLargeValueThresholdPredicateSql,
  buildOrphanedEntryPredicateSql,
} from './admin-v2-ledger-anomalies-value-integrity.query-helpers';
import { DUPLICATE_RISK_WINDOW_DAYS, ORPHANED_ENTRY_GRACE_HOURS } from './admin-v2-ledger-anomalies.dto';
import {
  type AnomalyRow,
  type LedgerAnomalyListQueryParams,
  buildAnomalyCursorSql,
} from './admin-v2-ledger-anomalies.query.types';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminV2LedgerAnomaliesValueIntegrityQuery {
  constructor(private readonly prisma: PrismaService) {}

  async countLargeValueOutliers(now: Date) {
    const windowStart = new Date(now.getTime() - SUMMARY_OUTLIER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.created_at >= ${windowStart}
        AND le.created_at <= ${now}
        AND (${buildLargeValueThresholdPredicateSql()})
    `);

    return rows[0]?.count ?? 0;
  }

  async countOrphanedEntries(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - ORPHANED_ENTRY_GRACE_HOURS * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.created_at < ${cutoff}
        ${buildOrphanedEntryPredicateSql()}
    `);

    return rows[0]?.count ?? 0;
  }

  async countDuplicateIdempotencyRisk(now: Date): Promise<number> {
    const windowStart = new Date(now.getTime() - DUPLICATE_RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        ${buildDuplicateIdempotencyRiskPredicateSql()}
        AND le.created_at >= ${windowStart}
        AND le.created_at <= ${now}
    `);

    return rows[0]?.count ?? 0;
  }

  async countImpossibleTransitions(now: Date): Promise<number> {
    void now;
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      ${buildImpossibleTransitionCountLateralSql()}
      WHERE le.deleted_at IS NULL
    `);

    return rows[0]?.count ?? 0;
  }

  listLargeValueOutliers(params: LedgerAnomalyListQueryParams) {
    return this.prisma.$queryRaw<AnomalyRow[]>(Prisma.sql`
      SELECT
        le.id AS "id",
        le.id AS "ledgerEntryId",
        le.consumer_id AS "consumerId",
        le.type::text AS "type",
        le.amount AS "amount",
        le.currency_code::text AS "currencyCode",
        le.status::text AS "entryStatus",
        NULL::text AS "outcomeStatus",
        NULL::timestamptz AS "outcomeAt",
        le.created_at AS "createdAt",
        le.updated_at AS "updatedAt",
        le.created_at AS "anomalyAt",
        thresholds.threshold AS "threshold"
      FROM ledger_entry le
      ${buildLargeValueThresholdLateralSql()}
      WHERE le.deleted_at IS NULL
        AND le.created_at >= ${params.dateFrom}
        AND le.created_at <= ${params.dateTo}
        AND ABS(le.amount) >= thresholds.threshold
        ${buildAnomalyCursorSql(Prisma.sql`le.created_at`, params.cursor)}
      ORDER BY le.created_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
  }

  listOrphanedEntries(params: LedgerAnomalyListQueryParams, now: Date) {
    const cutoff = new Date(now.getTime() - ORPHANED_ENTRY_GRACE_HOURS * 60 * 60 * 1000);
    return this.prisma.$queryRaw<AnomalyRow[]>(Prisma.sql`
      SELECT
        le.id AS "id",
        le.id AS "ledgerEntryId",
        le.consumer_id AS "consumerId",
        le.type::text AS "type",
        le.amount AS "amount",
        le.currency_code::text AS "currencyCode",
        le.status::text AS "entryStatus",
        NULL::text AS "outcomeStatus",
        NULL::timestamptz AS "outcomeAt",
        le.created_at AS "createdAt",
        le.updated_at AS "updatedAt",
        le.created_at AS "anomalyAt",
        NULL::int AS "threshold",
        NULL::text AS "stripeId",
        NULL::text AS "prevStatus",
        NULL::text AS "nextStatus"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.created_at < ${cutoff}
        AND le.created_at >= ${params.dateFrom}
        AND le.created_at <= ${params.dateTo}
        ${buildOrphanedEntryPredicateSql()}
        ${buildAnomalyCursorSql(Prisma.sql`le.created_at`, params.cursor)}
      ORDER BY le.created_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
  }

  listDuplicateIdempotencyRisk(params: LedgerAnomalyListQueryParams) {
    return this.prisma.$queryRaw<AnomalyRow[]>(Prisma.sql`
      SELECT
        le.id AS "id",
        le.id AS "ledgerEntryId",
        le.consumer_id AS "consumerId",
        le.type::text AS "type",
        le.amount AS "amount",
        le.currency_code::text AS "currencyCode",
        le.status::text AS "entryStatus",
        NULL::text AS "outcomeStatus",
        NULL::timestamptz AS "outcomeAt",
        le.created_at AS "createdAt",
        le.updated_at AS "updatedAt",
        le.created_at AS "anomalyAt",
        NULL::int AS "threshold",
        le.stripe_id AS "stripeId",
        NULL::text AS "prevStatus",
        NULL::text AS "nextStatus"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        ${buildDuplicateIdempotencyRiskPredicateSql()}
        AND le.created_at >= ${params.dateFrom}
        AND le.created_at <= ${params.dateTo}
        ${buildAnomalyCursorSql(Prisma.sql`le.created_at`, params.cursor)}
      ORDER BY le.created_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
  }

  listImpossibleTransitions(params: LedgerAnomalyListQueryParams) {
    return this.prisma.$queryRaw<AnomalyRow[]>(Prisma.sql`
      SELECT
        le.id AS "id",
        le.id AS "ledgerEntryId",
        le.consumer_id AS "consumerId",
        le.type::text AS "type",
        le.amount AS "amount",
        le.currency_code::text AS "currencyCode",
        le.status::text AS "entryStatus",
        violation.next_status::text AS "outcomeStatus",
        violation.violation_at AS "outcomeAt",
        le.created_at AS "createdAt",
        le.updated_at AS "updatedAt",
        violation.violation_at AS "anomalyAt",
        NULL::int AS "threshold",
        NULL::text AS "stripeId",
        violation.prev_status::text AS "prevStatus",
        violation.next_status::text AS "nextStatus"
      FROM ledger_entry le
      ${buildImpossibleTransitionListLateralSql(params.dateFrom, params.dateTo)}
      WHERE le.deleted_at IS NULL
        ${buildAnomalyCursorSql(Prisma.sql`violation.violation_at`, params.cursor)}
      ORDER BY violation.violation_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
  }

  async countLargeValueOutliersForRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      ${buildLargeValueThresholdLateralSql()}
      WHERE le.deleted_at IS NULL
        AND le.created_at >= ${dateFrom}
        AND le.created_at <= ${dateTo}
        AND ABS(le.amount) >= thresholds.threshold
    `);

    return rows[0]?.count ?? 0;
  }

  async countOrphanedEntriesForRange(dateFrom: Date, dateTo: Date, now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - ORPHANED_ENTRY_GRACE_HOURS * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.created_at < ${cutoff}
        AND le.created_at >= ${dateFrom}
        AND le.created_at <= ${dateTo}
        ${buildOrphanedEntryPredicateSql()}
    `);

    return rows[0]?.count ?? 0;
  }

  async countDuplicateIdempotencyRiskForRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        ${buildDuplicateIdempotencyRiskPredicateSql()}
        AND le.created_at >= ${dateFrom}
        AND le.created_at <= ${dateTo}
    `);

    return rows[0]?.count ?? 0;
  }

  async countImpossibleTransitionsForRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      ${buildImpossibleTransitionRangeCountLateralSql(dateFrom, dateTo)}
      WHERE le.deleted_at IS NULL
    `);

    return rows[0]?.count ?? 0;
  }
}
