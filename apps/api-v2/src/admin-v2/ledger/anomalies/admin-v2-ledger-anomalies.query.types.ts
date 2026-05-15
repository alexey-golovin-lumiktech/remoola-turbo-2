import { Prisma } from '@remoola/database-2';

import { buildDescendingCreatedAtIdCursorSql } from '../../../shared/prisma-raw.utils';

type LedgerAnomalyCursor = {
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

export function buildAnomalyCursorSql(column: Prisma.Sql, cursor: LedgerAnomalyCursor) {
  return buildDescendingCreatedAtIdCursorSql({
    timestampColumn: column,
    idColumn: Prisma.sql`le.id`,
    cursor,
  });
}
