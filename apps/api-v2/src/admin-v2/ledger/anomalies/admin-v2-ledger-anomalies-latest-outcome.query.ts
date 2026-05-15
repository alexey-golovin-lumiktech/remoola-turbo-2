import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { INCONSISTENT_CHAIN_GRACE_MINUTES, STALE_PENDING_HOURS } from './admin-v2-ledger-anomalies.dto';
import {
  type AnomalyRow,
  type LedgerAnomalyListQueryParams,
  buildAnomalyCursorSql,
} from './admin-v2-ledger-anomalies.query.types';
import { sqlInList } from '../../../shared/prisma-raw.utils';
import { PrismaService } from '../../../shared/prisma.service';

const PENDING_OUTCOME_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
  $Enums.TransactionStatus.PENDING,
] as const;

type CountRow = {
  count: number;
};

@Injectable()
export class AdminV2LedgerAnomaliesLatestOutcomeQuery {
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
        AND latest.status::text IN (${sqlInList(PENDING_OUTCOME_STATUSES)})
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
        AND latest.status::text IN (${sqlInList(PENDING_OUTCOME_STATUSES)})
        AND latest.created_at < ${cutoff}
        AND latest.created_at >= ${params.dateFrom}
        AND latest.created_at <= ${params.dateTo}
        ${buildAnomalyCursorSql(Prisma.sql`latest.created_at`, params.cursor)}
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
        ${buildAnomalyCursorSql(Prisma.sql`latest.created_at`, params.cursor)}
      ORDER BY latest.created_at DESC, le.id DESC
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
        AND latest.status::text IN (${sqlInList(PENDING_OUTCOME_STATUSES)})
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
}
