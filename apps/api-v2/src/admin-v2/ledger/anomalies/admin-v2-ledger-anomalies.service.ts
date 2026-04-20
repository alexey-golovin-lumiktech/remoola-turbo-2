import { BadRequestException, Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  DEFAULT_ANOMALY_LIMIT,
  DUPLICATE_RISK_WINDOW_DAYS,
  INCONSISTENT_CHAIN_GRACE_MINUTES,
  LARGE_VALUE_THRESHOLDS,
  LEDGER_ANOMALY_CLASSES,
  MAX_ANOMALY_LIMIT,
  MAX_ANOMALY_RANGE_DAYS,
  ORPHANED_ENTRY_GRACE_HOURS,
  STALE_PENDING_HOURS,
  TERMINAL_OUTCOME_STATUSES,
  type LedgerAnomaliesListParams,
  type LedgerAnomalyClass,
  type LedgerAnomalyClassSummary,
  type LedgerAnomalyEntry,
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
} from './admin-v2-ledger-anomalies.dto';
import { PrismaService } from '../../../shared/prisma.service';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../../admin-v2-cursor';

const CLASS_LABELS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `Stale pending entries`,
  inconsistentOutcomeChains: `Inconsistent outcome chains`,
  largeValueOutliers: `Large value outliers`,
  orphanedEntries: `Orphaned entries`,
  duplicateIdempotencyRisk: `Duplicate idempotency risk`,
  impossibleTransitions: `Impossible transitions`,
};

const CLASS_HREFS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `/ledger/anomalies?class=stalePendingEntries`,
  inconsistentOutcomeChains: `/ledger/anomalies?class=inconsistentOutcomeChains`,
  largeValueOutliers: `/ledger/anomalies?class=largeValueOutliers`,
  orphanedEntries: `/ledger/anomalies?class=orphanedEntries`,
  duplicateIdempotencyRisk: `/ledger/anomalies?class=duplicateIdempotencyRisk`,
  impossibleTransitions: `/ledger/anomalies?class=impossibleTransitions`,
};

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

type AnomalyRow = {
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

function isLedgerAnomalyClass(value: string): value is LedgerAnomalyClass {
  return (LEDGER_ANOMALY_CLASSES as readonly string[]).includes(value);
}

function normalizeLimit(limit?: number) {
  return Math.min(MAX_ANOMALY_LIMIT, Math.max(1, limit ?? DEFAULT_ANOMALY_LIMIT));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(`en-US`).format(value);
}

function formatAge(from: Date, now: Date) {
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

function formatAbsoluteAmount(amount: Prisma.Decimal) {
  const raw = amount.toString();
  return raw.startsWith(`-`) ? raw.slice(1) : raw;
}

@Injectable()
export class AdminV2LedgerAnomaliesService {
  constructor(private readonly prisma: PrismaService) {}

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
      this.getSummaryForClass(`stalePendingEntries`, () => this.countStalePendingEntries(computedAt)),
      this.getSummaryForClass(`inconsistentOutcomeChains`, () => this.countInconsistentOutcomeChains(computedAt)),
      this.getSummaryForClass(`largeValueOutliers`, () => this.countLargeValueOutliers(computedAt)),
      this.getSummaryForClass(`orphanedEntries`, () => this.countOrphanedEntries(computedAt)),
      this.getSummaryForClass(`duplicateIdempotencyRisk`, () => this.countDuplicateIdempotencyRisk(computedAt)),
      this.getSummaryForClass(`impossibleTransitions`, () => this.countImpossibleTransitions(computedAt)),
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

  async getList(params: LedgerAnomaliesListParams): Promise<LedgerAnomalyListResponse> {
    const className = this.assertClassName(params.className);
    const { dateFrom, dateTo } = this.assertDateRange(params.dateFrom, params.dateTo);
    const limit = normalizeLimit(params.limit);
    const cursor = decodeAdminV2Cursor(params.cursor);
    const computedAt = new Date();
    const rows =
      className === `stalePendingEntries`
        ? await this.listStalePendingEntries({ dateFrom, dateTo, limit, cursor }, computedAt)
        : className === `inconsistentOutcomeChains`
          ? await this.listInconsistentOutcomeChains({ dateFrom, dateTo, limit, cursor }, computedAt)
          : className === `largeValueOutliers`
            ? await this.listLargeValueOutliers({ dateFrom, dateTo, limit, cursor })
            : className === `orphanedEntries`
              ? await this.listOrphanedEntries({ dateFrom, dateTo, limit, cursor }, computedAt)
              : className === `duplicateIdempotencyRisk`
                ? await this.listDuplicateIdempotencyRisk({ dateFrom, dateTo, limit, cursor })
                : await this.listImpossibleTransitions({ dateFrom, dateTo, limit, cursor });
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

  private async countStalePendingEntries(now: Date) {
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

  private async countInconsistentOutcomeChains(now: Date) {
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

  private async countLargeValueOutliers(now: Date) {
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

  private async countOrphanedEntries(now: Date): Promise<number> {
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

  private async countDuplicateIdempotencyRisk(now: Date): Promise<number> {
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

  private async countImpossibleTransitions(now: Date): Promise<number> {
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

  private async listStalePendingEntries(
    params: {
      dateFrom: Date;
      dateTo: Date;
      limit: number;
      cursor: { createdAt: Date; id: string } | null;
    },
    now: Date,
  ) {
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

  private async listInconsistentOutcomeChains(
    params: {
      dateFrom: Date;
      dateTo: Date;
      limit: number;
      cursor: { createdAt: Date; id: string } | null;
    },
    now: Date,
  ) {
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

  private async listLargeValueOutliers(params: {
    dateFrom: Date;
    dateTo: Date;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }) {
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

  private async listOrphanedEntries(
    params: {
      dateFrom: Date;
      dateTo: Date;
      limit: number;
      cursor: { createdAt: Date; id: string } | null;
    },
    now: Date,
  ) {
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

  private async listDuplicateIdempotencyRisk(params: {
    dateFrom: Date;
    dateTo: Date;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }) {
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

  private async listImpossibleTransitions(params: {
    dateFrom: Date;
    dateTo: Date;
    limit: number;
    cursor: { createdAt: Date; id: string } | null;
  }) {
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

  private buildLargeValueThresholdSql() {
    return Prisma.join(
      LARGE_VALUE_THRESHOLD_ENTRIES.map(
        ([currencyCode, threshold]) =>
          Prisma.sql`(le.currency_code::text = ${currencyCode} AND ABS(le.amount) >= ${threshold})`,
      ),
      ` OR `,
    );
  }

  private buildCursorSql(column: Prisma.Sql, cursor: { createdAt: Date; id: string } | null) {
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
