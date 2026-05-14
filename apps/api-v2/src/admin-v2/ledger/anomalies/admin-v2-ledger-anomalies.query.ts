import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  DUPLICATE_RISK_WINDOW_DAYS,
  INCONSISTENT_CHAIN_GRACE_MINUTES,
  LARGE_VALUE_THRESHOLDS,
  ORPHANED_ENTRY_GRACE_HOURS,
  STALE_PENDING_HOURS,
  TERMINAL_OUTCOME_STATUSES,
} from './admin-v2-ledger-anomalies.dto';
import { PrismaService } from '../../../shared/prisma.service';

const PENDING_OUTCOME_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
  $Enums.TransactionStatus.PENDING,
] as const;
const SUMMARY_OUTLIER_WINDOW_DAYS = 30;
const LARGE_VALUE_THRESHOLD_ENTRIES = Object.entries(LARGE_VALUE_THRESHOLDS) as Array<[$Enums.CurrencyCode, number]>;

type CountRow = {
  count: number;
};

export type LedgerAnomalyCursor = {
  createdAt: Date;
  id: string;
} | null;

export type LedgerAnomalyListQueryParams = {
  dateFrom: Date;
  dateTo: Date;
  limit: number;
  cursor: LedgerAnomalyCursor;
};

export type AnomalyRow = {
  id: string;
  ledgerEntryId: string;
  consumerId: string;
  type: string;
  amount: Prisma.Decimal;
  currencyCode: string;
  entryStatus: string;
  outcomeStatus: string | null;
  outcomeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  anomalyAt: Date;
  threshold: number | null;
  stripeId?: string | null;
  prevStatus?: string | null;
  nextStatus?: string | null;
};

@Injectable()
export class AdminV2LedgerAnomaliesQuery {
  constructor(private readonly prisma: PrismaService) {}

  async countStalePendingEntries(now: Date) {
    const cutoff = new Date(now.getTime() - STALE_PENDING_HOURS * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT o.status, o.created_at
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) latest ON true
      WHERE le.deleted_at IS NULL
        AND latest.status::text IN (${Prisma.join(PENDING_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`))})
        AND latest.created_at < ${cutoff}
    `);

    return rows[0]?.count ?? 0;
  }

  async countInconsistentOutcomeChains(now: Date) {
    const cutoff = new Date(now.getTime() - INCONSISTENT_CHAIN_GRACE_MINUTES * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT o.status, o.created_at
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) latest ON true
      WHERE le.deleted_at IS NULL
        AND le.status <> latest.status
        AND latest.created_at < ${cutoff}
    `);

    return rows[0]?.count ?? 0;
  }

  async countLargeValueOutliers(now: Date) {
    const windowStart = new Date(now.getTime() - SUMMARY_OUTLIER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.created_at >= ${windowStart}
        AND le.created_at <= ${now}
        AND (${this.buildLargeValueThresholdSql()})
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
        AND NOT EXISTS (
          SELECT 1
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
        )
    `);

    return rows[0]?.count ?? 0;
  }

  async countDuplicateIdempotencyRisk(now: Date): Promise<number> {
    const windowStart = new Date(now.getTime() - DUPLICATE_RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.idempotency_key IS NULL
        AND le.stripe_id IS NOT NULL
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
      JOIN LATERAL (
        SELECT 1
        FROM (
          SELECT
            o.status,
            LAG(o.status) OVER (ORDER BY o.created_at, o.id) AS prev_status
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
        ) chain
        WHERE chain.prev_status::text IN (${Prisma.join(
          TERMINAL_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`),
        )})
        LIMIT 1
      ) violation ON true
      WHERE le.deleted_at IS NULL
    `);

    return rows[0]?.count ?? 0;
  }

  listStalePendingEntries(params: LedgerAnomalyListQueryParams, now: Date) {
    const cutoff = new Date(now.getTime() - STALE_PENDING_HOURS * 60 * 60 * 1000);
    return this.prisma.$queryRaw<AnomalyRow[]>(Prisma.sql`
      SELECT
        le.id AS "id",
        le.id AS "ledgerEntryId",
        le.consumer_id AS "consumerId",
        le.type::text AS "type",
        le.amount AS "amount",
        le.currency_code::text AS "currencyCode",
        le.status::text AS "entryStatus",
        latest.status::text AS "outcomeStatus",
        latest.created_at AS "outcomeAt",
        le.created_at AS "createdAt",
        le.updated_at AS "updatedAt",
        latest.created_at AS "anomalyAt",
        NULL::int AS "threshold"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT o.status, o.created_at
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) latest ON true
      WHERE le.deleted_at IS NULL
        AND latest.status::text IN (${Prisma.join(PENDING_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`))})
        AND latest.created_at < ${cutoff}
        AND latest.created_at >= ${params.dateFrom}
        AND latest.created_at <= ${params.dateTo}
        ${this.buildCursorSql(Prisma.sql`latest.created_at`, params.cursor)}
      ORDER BY latest.created_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
  }

  listInconsistentOutcomeChains(params: LedgerAnomalyListQueryParams, now: Date) {
    const cutoff = new Date(now.getTime() - INCONSISTENT_CHAIN_GRACE_MINUTES * 60 * 1000);
    return this.prisma.$queryRaw<AnomalyRow[]>(Prisma.sql`
      SELECT
        le.id AS "id",
        le.id AS "ledgerEntryId",
        le.consumer_id AS "consumerId",
        le.type::text AS "type",
        le.amount AS "amount",
        le.currency_code::text AS "currencyCode",
        le.status::text AS "entryStatus",
        latest.status::text AS "outcomeStatus",
        latest.created_at AS "outcomeAt",
        le.created_at AS "createdAt",
        le.updated_at AS "updatedAt",
        latest.created_at AS "anomalyAt",
        NULL::int AS "threshold"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT o.status, o.created_at
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) latest ON true
      WHERE le.deleted_at IS NULL
        AND le.status <> latest.status
        AND latest.created_at < ${cutoff}
        AND latest.created_at >= ${params.dateFrom}
        AND latest.created_at <= ${params.dateTo}
        ${this.buildCursorSql(Prisma.sql`latest.created_at`, params.cursor)}
      ORDER BY latest.created_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
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
      JOIN LATERAL (
        SELECT threshold
        FROM (
          VALUES ${Prisma.join(
            LARGE_VALUE_THRESHOLD_ENTRIES.map(
              ([currencyCode, threshold]) => Prisma.sql`(${currencyCode}, ${threshold})`,
            ),
            `, `,
          )}
        ) AS threshold_map(currency_code, threshold)
        WHERE threshold_map.currency_code = le.currency_code::text
      ) thresholds ON true
      WHERE le.deleted_at IS NULL
        AND le.created_at >= ${params.dateFrom}
        AND le.created_at <= ${params.dateTo}
        AND ABS(le.amount) >= thresholds.threshold
        ${this.buildCursorSql(Prisma.sql`le.created_at`, params.cursor)}
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
        AND NOT EXISTS (
          SELECT 1
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
        )
        ${this.buildCursorSql(Prisma.sql`le.created_at`, params.cursor)}
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
        AND le.idempotency_key IS NULL
        AND le.stripe_id IS NOT NULL
        AND le.created_at >= ${params.dateFrom}
        AND le.created_at <= ${params.dateTo}
        ${this.buildCursorSql(Prisma.sql`le.created_at`, params.cursor)}
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
      JOIN LATERAL (
        SELECT
          chain.prev_status,
          chain.next_status,
          chain.violation_at
        FROM (
          SELECT
            o.status AS next_status,
            o.created_at AS violation_at,
            LAG(o.status) OVER (ORDER BY o.created_at, o.id) AS prev_status
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
        ) chain
        WHERE chain.prev_status::text IN (${Prisma.join(
          TERMINAL_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`),
        )})
          AND chain.violation_at >= ${params.dateFrom}
          AND chain.violation_at <= ${params.dateTo}
        ORDER BY chain.violation_at DESC
        LIMIT 1
      ) violation ON true
      WHERE le.deleted_at IS NULL
        ${this.buildCursorSql(Prisma.sql`violation.violation_at`, params.cursor)}
      ORDER BY violation.violation_at DESC, le.id DESC
      LIMIT ${params.limit + 1}
    `);
  }

  async countStalePendingEntriesForRange(dateFrom: Date, dateTo: Date, now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - STALE_PENDING_HOURS * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT o.status, o.created_at
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) latest ON true
      WHERE le.deleted_at IS NULL
        AND latest.status::text IN (${Prisma.join(PENDING_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`))})
        AND latest.created_at < ${cutoff}
        AND latest.created_at >= ${dateFrom}
        AND latest.created_at <= ${dateTo}
    `);

    return rows[0]?.count ?? 0;
  }

  async countInconsistentOutcomeChainsForRange(dateFrom: Date, dateTo: Date, now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - INCONSISTENT_CHAIN_GRACE_MINUTES * 60 * 1000);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT o.status, o.created_at
        FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ) latest ON true
      WHERE le.deleted_at IS NULL
        AND le.status <> latest.status
        AND latest.created_at < ${cutoff}
        AND latest.created_at >= ${dateFrom}
        AND latest.created_at <= ${dateTo}
    `);

    return rows[0]?.count ?? 0;
  }

  async countLargeValueOutliersForRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT threshold
        FROM (
          VALUES ${Prisma.join(
            LARGE_VALUE_THRESHOLD_ENTRIES.map(
              ([currencyCode, threshold]) => Prisma.sql`(${currencyCode}, ${threshold})`,
            ),
            `, `,
          )}
        ) AS threshold_map(currency_code, threshold)
        WHERE threshold_map.currency_code = le.currency_code::text
      ) thresholds ON true
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
        AND NOT EXISTS (
          SELECT 1
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
        )
    `);

    return rows[0]?.count ?? 0;
  }

  async countDuplicateIdempotencyRiskForRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      WHERE le.deleted_at IS NULL
        AND le.idempotency_key IS NULL
        AND le.stripe_id IS NOT NULL
        AND le.created_at >= ${dateFrom}
        AND le.created_at <= ${dateTo}
    `);

    return rows[0]?.count ?? 0;
  }

  async countImpossibleTransitionsForRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM ledger_entry le
      JOIN LATERAL (
        SELECT 1
        FROM (
          SELECT
            o.status AS next_status,
            o.created_at AS violation_at,
            LAG(o.status) OVER (ORDER BY o.created_at, o.id) AS prev_status
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
        ) chain
        WHERE chain.prev_status::text IN (${Prisma.join(
          TERMINAL_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`),
        )})
          AND chain.violation_at >= ${dateFrom}
          AND chain.violation_at <= ${dateTo}
        LIMIT 1
      ) violation ON true
      WHERE le.deleted_at IS NULL
    `);

    return rows[0]?.count ?? 0;
  }

  private buildLargeValueThresholdSql() {
    return Prisma.join(
      LARGE_VALUE_THRESHOLD_ENTRIES.map(
        ([currencyCode, threshold]) =>
          Prisma.sql`(le.currency_code::text = ${currencyCode} AND ABS(le.amount) >= ${threshold})`,
      ),
      ` OR `,
    );
  }

  private buildCursorSql(column: Prisma.Sql, cursor: LedgerAnomalyCursor) {
    if (!cursor) {
      return Prisma.empty;
    }

    return Prisma.sql`
      AND (
        ${column} < ${cursor.createdAt}
        OR (${column} = ${cursor.createdAt} AND le.id < ${cursor.id})
      )
    `;
  }
}
