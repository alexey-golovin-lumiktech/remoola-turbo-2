import { type $Enums, Prisma } from '@remoola/database-2';

import {
  adminActionAuditContextInclude,
  ledgerCaseSelect,
  ledgerDisputeInclude,
  ledgerListInclude,
  relatedLedgerEntrySelect,
} from './admin-v2-ledger.query-definitions';
import {
  assertRawDate,
  assertRawUuid,
  buildDateRangeSql,
  buildDescendingCreatedAtIdCursorSql,
  buildOptionalUuidEqualsSql,
  isUuid,
} from '../../shared/prisma-raw.utils';
import { buildCreatedAtIdCursorWhere } from '../admin-v2-query.utils';

export type LedgerCursor = {
  createdAt: Date;
  id: string;
} | null;

export type AmountSignFilter = `positive` | `negative` | `zero`;

type PageIdRow = {
  id: string;
  created_at: Date;
};

type StatusFilteredLedgerPageIdsSqlParams = {
  limit: number;
  cursor: LedgerCursor;
  search?: string;
  type?: $Enums.LedgerEntryType;
  status: $Enums.TransactionStatus;
  currencyCode?: $Enums.CurrencyCode;
  paymentRequestId?: string;
  consumerId?: string;
  amountSign?: AmountSignFilter;
  createdAt?: Prisma.DateTimeFilter;
};

type LedgerListWhereParams = {
  cursor: LedgerCursor;
  search?: string;
  type?: $Enums.LedgerEntryType;
  currencyCode?: $Enums.CurrencyCode;
  paymentRequestId?: string;
  consumerId?: string;
  amountSign?: AmountSignFilter;
  createdAt?: Prisma.DateTimeFilter;
};

type LedgerDisputesWhereParams = {
  cursor: LedgerCursor;
  search?: string;
  paymentRequestId?: string;
  consumerId?: string;
  createdAt?: Prisma.DateTimeFilter;
};

function dateRangeSqlParams(createdAt?: Prisma.DateTimeFilter): { from?: Date; to?: Date } {
  return {
    from: createdAt?.gte instanceof Date ? createdAt.gte : undefined,
    to: createdAt?.lte instanceof Date ? createdAt.lte : undefined,
  };
}

export function parsePageIdRows(rows: unknown[]): PageIdRow[] {
  return rows.map((row) => {
    if (row == null || typeof row !== `object`) {
      throw new Error(`Invalid ledger raw page row`);
    }

    return {
      id: assertRawUuid((row as { id?: unknown }).id, `ledger raw page row id`),
      created_at: assertRawDate((row as { created_at?: unknown }).created_at, `ledger raw page row created_at`),
    };
  });
}

export function buildStatusFilteredLedgerPageIdsSql(params: StatusFilteredLedgerPageIdsSqlParams): Prisma.Sql {
  const searchPattern = params.search ? `%${params.search}%` : null;
  const typeSql = params.type ? Prisma.sql`AND le.type::text = ${params.type}` : Prisma.empty;
  const currencySql = params.currencyCode
    ? Prisma.sql`AND le.currency_code::text = ${params.currencyCode}`
    : Prisma.empty;
  const paymentRequestSql = buildOptionalUuidEqualsSql(Prisma.sql`le.payment_request_id`, params.paymentRequestId);
  const consumerSql = buildOptionalUuidEqualsSql(Prisma.sql`le.consumer_id`, params.consumerId);
  const amountSignSql =
    params.amountSign === `positive`
      ? Prisma.sql`AND le.amount > 0`
      : params.amountSign === `negative`
        ? Prisma.sql`AND le.amount < 0`
        : params.amountSign === `zero`
          ? Prisma.sql`AND le.amount = 0`
          : Prisma.empty;
  const createdAtSql = buildDateRangeSql(Prisma.sql`le.created_at`, dateRangeSqlParams(params.createdAt));
  const searchSql = searchPattern
    ? Prisma.sql`
        AND (
          LOWER(COALESCE(le.stripe_id, '')) LIKE LOWER(${searchPattern})
          OR LOWER(COALESCE(le.idempotency_key, '')) LIKE LOWER(${searchPattern})
          ${
            isUuid(params.search)
              ? Prisma.sql`
                  OR le.id::text = ${params.search}
                  OR le.ledger_id::text = ${params.search}
                  OR le.payment_request_id::text = ${params.search}
                `
              : Prisma.empty
          }
        )
      `
    : Prisma.empty;
  const cursorSql = buildDescendingCreatedAtIdCursorSql({
    timestampColumn: Prisma.sql`le.created_at`,
    idColumn: Prisma.sql`le.id`,
    cursor: params.cursor,
  });

  return Prisma.sql`
    SELECT le.id, le.created_at
    FROM ledger_entry le
    LEFT JOIN LATERAL (
      SELECT leo.status
      FROM ledger_entry_outcome leo
      WHERE leo.ledger_entry_id = le.id
      ORDER BY leo.created_at DESC, leo.id DESC
      LIMIT 1
    ) latest_outcome ON true
    WHERE COALESCE(latest_outcome.status::text, le.status::text) = ${params.status}
      AND le.deleted_at IS NULL
      ${typeSql}
      ${currencySql}
      ${paymentRequestSql}
      ${consumerSql}
      ${amountSignSql}
      ${createdAtSql}
      ${searchSql}
      ${cursorSql}
    ORDER BY le.created_at DESC, le.id DESC
    LIMIT ${params.limit + 1}
  `;
}

export function buildLedgerListWhere(params: LedgerListWhereParams): Prisma.LedgerEntryModelWhereInput {
  const invalidUuidFilter =
    (params.paymentRequestId?.trim() ? !isUuid(params.paymentRequestId) : false) ||
    (params.consumerId?.trim() ? !isUuid(params.consumerId) : false);

  return {
    deletedAt: null,
    ...(invalidUuidFilter ? { id: { in: [] } } : {}),
    ...buildCreatedAtIdCursorWhere(params.cursor),
    ...(params.type ? { type: params.type } : {}),
    ...(params.currencyCode ? { currencyCode: params.currencyCode } : {}),
    ...(params.paymentRequestId && isUuid(params.paymentRequestId)
      ? { paymentRequestId: params.paymentRequestId }
      : {}),
    ...(params.consumerId && isUuid(params.consumerId) ? { consumerId: params.consumerId } : {}),
    ...(params.createdAt ? { createdAt: params.createdAt } : {}),
    ...(params.amountSign === `positive`
      ? { amount: { gt: 0 } }
      : params.amountSign === `negative`
        ? { amount: { lt: 0 } }
        : params.amountSign === `zero`
          ? { amount: { equals: 0 } }
          : {}),
    ...(params.search
      ? {
          OR: [
            { stripeId: { contains: params.search, mode: `insensitive` } },
            { idempotencyKey: { contains: params.search, mode: `insensitive` } },
            ...(isUuid(params.search)
              ? [{ id: params.search }, { ledgerId: params.search }, { paymentRequestId: params.search }]
              : []),
          ],
        }
      : {}),
  };
}

export function buildLedgerListFindManyArgs(params: LedgerListWhereParams & { limit: number }) {
  return {
    where: buildLedgerListWhere(params),
    include: ledgerListInclude,
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: params.limit + 1,
  } satisfies Prisma.LedgerEntryModelFindManyArgs;
}

export function buildStatusHydrationFindManyArgs(pageIds: readonly string[]) {
  return {
    where: { id: { in: [...pageIds] } },
    include: ledgerListInclude,
  } satisfies Prisma.LedgerEntryModelFindManyArgs;
}

export function buildLedgerCaseFindUniqueArgs(ledgerEntryId: string) {
  return {
    where: { id: ledgerEntryId },
    select: ledgerCaseSelect,
  } satisfies Prisma.LedgerEntryModelFindUniqueArgs;
}

export function buildRelatedLedgerEntriesFindManyArgs(ledgerId: string) {
  return {
    where: {
      ledgerId,
      deletedAt: null,
    },
    orderBy: [{ createdAt: `asc` }, { id: `asc` }],
    select: relatedLedgerEntrySelect,
  } satisfies Prisma.LedgerEntryModelFindManyArgs;
}

export function buildLedgerAuditContextFindManyArgs(paymentRequestId: string) {
  return {
    where: {
      resourceId: paymentRequestId,
    },
    include: adminActionAuditContextInclude,
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 20,
  } satisfies Prisma.AdminActionAuditLogModelFindManyArgs;
}

export function buildLedgerDisputesWhere(params: LedgerDisputesWhereParams): Prisma.LedgerEntryDisputeModelWhereInput {
  const where: Prisma.LedgerEntryDisputeModelWhereInput[] = [];

  if (params.createdAt) {
    where.push({ createdAt: params.createdAt });
  }

  if (params.cursor) {
    where.push({
      OR: [
        { createdAt: { lt: params.cursor.createdAt } },
        { AND: [{ createdAt: params.cursor.createdAt }, { id: { lt: params.cursor.id } }] },
      ],
    });
  }

  if (params.search) {
    where.push({
      OR: [
        { stripeDisputeId: { contains: params.search, mode: `insensitive` } },
        ...(isUuid(params.search) ? [{ id: params.search }, { ledgerEntryId: params.search }] : []),
      ],
    });
  }

  if (params.paymentRequestId || params.consumerId) {
    where.push({
      ledgerEntry: {
        ...(params.paymentRequestId ? { paymentRequestId: params.paymentRequestId } : {}),
        ...(params.consumerId ? { consumerId: params.consumerId } : {}),
      },
    });
  }

  return where.length > 0 ? { AND: where } : {};
}

export function buildLedgerDisputesFindManyArgs(params: LedgerDisputesWhereParams & { limit: number }) {
  return {
    where: buildLedgerDisputesWhere(params),
    include: ledgerDisputeInclude,
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: params.limit + 1,
  } satisfies Prisma.LedgerEntryDisputeModelFindManyArgs;
}

export function sortLedgerRowsToPageOrder<T extends { id: string }>(
  pageIds: readonly string[],
  rows: readonly T[],
): T[] {
  const positionById = new Map(pageIds.map((id, index) => [id, index]));
  return [...rows].sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));
}

export function buildRawPageNextCursor(pageIdRows: readonly PageIdRow[], limit: number): LedgerCursor {
  const next = pageIdRows[limit];
  return next ? { createdAt: next.created_at, id: next.id } : null;
}
