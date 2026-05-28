import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  assertRawDate,
  assertRawUuid,
  buildDateRangeSql,
  buildDescendingCreatedAtIdCursorSql,
  buildOptionalUuidEqualsSql,
  isUuid,
} from '../../shared/prisma-raw.utils';
import { PrismaService } from '../../shared/prisma.service';
import { buildCreatedAtIdCursorWhere } from '../admin-v2-query.utils';

const ledgerListInclude = Prisma.validator<Prisma.LedgerEntryModelInclude>()({
  consumer: { select: { email: true } },
  paymentRequest: {
    select: {
      paymentRail: true,
      status: true,
      payerId: true,
      requesterId: true,
    },
  },
  outcomes: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 1,
    select: { status: true },
  },
  disputes: {
    select: { id: true },
  },
});

const ledgerCaseSelect = Prisma.validator<Prisma.LedgerEntryModelSelect>()({
  id: true,
  ledgerId: true,
  type: true,
  currencyCode: true,
  status: true,
  amount: true,
  feesType: true,
  feesAmount: true,
  stripeId: true,
  idempotencyKey: true,
  metadata: true,
  consumerId: true,
  paymentRequestId: true,
  createdAt: true,
  updatedAt: true,
  consumer: {
    select: {
      email: true,
    },
  },
  paymentRequest: {
    select: {
      id: true,
      status: true,
      paymentRail: true,
      payerId: true,
      requesterId: true,
      amount: true,
      currencyCode: true,
      payer: { select: { email: true } },
      requester: { select: { email: true } },
    },
  },
  outcomes: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    select: {
      id: true,
      status: true,
      source: true,
      externalId: true,
      createdAt: true,
    },
  },
  disputes: {
    orderBy: [{ createdAt: `asc` }, { id: `asc` }],
    select: {
      id: true,
      stripeDisputeId: true,
      metadata: true,
      createdAt: true,
    },
  },
});

const relatedLedgerEntrySelect = Prisma.validator<Prisma.LedgerEntryModelSelect>()({
  id: true,
  ledgerId: true,
  type: true,
  amount: true,
  currencyCode: true,
  status: true,
  createdAt: true,
  outcomes: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 1,
    select: { status: true },
  },
});

const adminActionAuditContextInclude = Prisma.validator<Prisma.AdminActionAuditLogModelInclude>()({
  admin: {
    select: {
      email: true,
    },
  },
});

const ledgerDisputeInclude = Prisma.validator<Prisma.LedgerEntryDisputeModelInclude>()({
  ledgerEntry: {
    select: {
      id: true,
      ledgerId: true,
      paymentRequestId: true,
      consumerId: true,
      type: true,
      amount: true,
      currencyCode: true,
      paymentRequest: {
        select: {
          paymentRail: true,
        },
      },
    },
  },
});

type LedgerCursor = {
  createdAt: Date;
  id: string;
} | null;

type AmountSignFilter = `positive` | `negative` | `zero`;

type PageIdRow = {
  id: string;
  created_at: Date;
};

function parsePageIdRows(rows: unknown[]): PageIdRow[] {
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

function dateRangeSqlParams(createdAt?: Prisma.DateTimeFilter): { from?: Date; to?: Date } {
  return {
    from: createdAt?.gte instanceof Date ? createdAt.gte : undefined,
    to: createdAt?.lte instanceof Date ? createdAt.lte : undefined,
  };
}

export type AdminV2LedgerListItemRecord = Prisma.LedgerEntryModelGetPayload<{
  include: typeof ledgerListInclude;
}>;

type AdminV2LedgerAuditContextRecord = Prisma.AdminActionAuditLogModelGetPayload<{
  include: typeof adminActionAuditContextInclude;
}>;

type AdminV2LedgerListQueryParams = {
  limit: number;
  cursor: LedgerCursor;
  search?: string;
  type?: $Enums.LedgerEntryType;
  status?: $Enums.TransactionStatus;
  currencyCode?: $Enums.CurrencyCode;
  paymentRequestId?: string;
  consumerId?: string;
  amountSign?: AmountSignFilter;
  createdAt?: Prisma.DateTimeFilter;
};

type AdminV2LedgerDisputesQueryParams = {
  limit: number;
  cursor: LedgerCursor;
  search?: string;
  paymentRequestId?: string;
  consumerId?: string;
  createdAt?: Prisma.DateTimeFilter;
};

@Injectable()
export class AdminV2LedgerQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listLedgerEntries(params: AdminV2LedgerListQueryParams) {
    const { limit, cursor, search, type, status, currencyCode, paymentRequestId, consumerId, amountSign, createdAt } =
      params;
    const searchPattern = search ? `%${search}%` : null;
    const invalidUuidFilter =
      (paymentRequestId?.trim() ? !isUuid(paymentRequestId) : false) ||
      (consumerId?.trim() ? !isUuid(consumerId) : false);

    if (status) {
      const deletedSql = Prisma.sql`AND le.deleted_at IS NULL`;
      const typeSql = type ? Prisma.sql`AND le.type::text = ${type}` : Prisma.empty;
      const currencySql = currencyCode ? Prisma.sql`AND le.currency_code::text = ${currencyCode}` : Prisma.empty;
      const paymentRequestSql = buildOptionalUuidEqualsSql(Prisma.sql`le.payment_request_id`, paymentRequestId);
      const consumerSql = buildOptionalUuidEqualsSql(Prisma.sql`le.consumer_id`, consumerId);
      const amountSignSql =
        amountSign === `positive`
          ? Prisma.sql`AND le.amount > 0`
          : amountSign === `negative`
            ? Prisma.sql`AND le.amount < 0`
            : amountSign === `zero`
              ? Prisma.sql`AND le.amount = 0`
              : Prisma.empty;
      const createdAtSql = buildDateRangeSql(Prisma.sql`le.created_at`, dateRangeSqlParams(createdAt));
      const searchSql = searchPattern
        ? Prisma.sql`
            AND (
              LOWER(COALESCE(le.stripe_id, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(le.idempotency_key, '')) LIKE LOWER(${searchPattern})
              ${
                isUuid(search)
                  ? Prisma.sql`
                      OR le.id::text = ${search}
                      OR le.ledger_id::text = ${search}
                      OR le.payment_request_id::text = ${search}
                    `
                  : Prisma.empty
              }
            )
          `
        : Prisma.empty;
      const cursorSql = buildDescendingCreatedAtIdCursorSql({
        timestampColumn: Prisma.sql`le.created_at`,
        idColumn: Prisma.sql`le.id`,
        cursor,
      });

      const rawPageIdRows = await this.prisma.$queryRaw<unknown[]>(Prisma.sql`
        SELECT le.id, le.created_at
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT leo.status
          FROM ledger_entry_outcome leo
          WHERE leo.ledger_entry_id = le.id
          ORDER BY leo.created_at DESC, leo.id DESC
          LIMIT 1
        ) latest_outcome ON true
        WHERE COALESCE(latest_outcome.status::text, le.status::text) = ${status}
          ${deletedSql}
          ${typeSql}
          ${currencySql}
          ${paymentRequestSql}
          ${consumerSql}
          ${amountSignSql}
          ${createdAtSql}
          ${searchSql}
          ${cursorSql}
        ORDER BY le.created_at DESC, le.id DESC
        LIMIT ${limit + 1}
      `);
      const pageIdRows = parsePageIdRows(rawPageIdRows);

      const pageIds = pageIdRows.slice(0, limit).map((row) => row.id);
      const rows: AdminV2LedgerListItemRecord[] =
        pageIds.length === 0
          ? []
          : await this.prisma.ledgerEntryModel.findMany({
              where: { id: { in: pageIds } },
              include: ledgerListInclude,
            });
      const positionById = new Map(pageIds.map((id, index) => [id, index]));
      rows.sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));
      const next = pageIdRows[limit];

      return {
        rows,
        nextCursorSource: next ? { createdAt: next.created_at, id: next.id } : null,
      };
    }

    const rows = await this.prisma.ledgerEntryModel.findMany({
      where: {
        deletedAt: null,
        ...(invalidUuidFilter ? { id: { in: [] } } : {}),
        ...buildCreatedAtIdCursorWhere(cursor),
        ...(type ? { type } : {}),
        ...(currencyCode ? { currencyCode } : {}),
        ...(paymentRequestId && isUuid(paymentRequestId) ? { paymentRequestId } : {}),
        ...(consumerId && isUuid(consumerId) ? { consumerId } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(amountSign === `positive`
          ? { amount: { gt: 0 } }
          : amountSign === `negative`
            ? { amount: { lt: 0 } }
            : amountSign === `zero`
              ? { amount: { equals: 0 } }
              : {}),
        ...(search
          ? {
              OR: [
                { stripeId: { contains: search, mode: `insensitive` } },
                { idempotencyKey: { contains: search, mode: `insensitive` } },
                ...(isUuid(search) ? [{ id: search }, { ledgerId: search }, { paymentRequestId: search }] : []),
              ],
            }
          : {}),
      },
      include: ledgerListInclude,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: limit + 1,
    });

    const next = rows[limit];
    return {
      rows: rows.slice(0, limit),
      nextCursorSource: next ? { createdAt: next.createdAt, id: next.id } : null,
    };
  }

  async getLedgerEntryCase(ledgerEntryId: string) {
    const entry = await this.prisma.ledgerEntryModel.findUnique({
      where: { id: ledgerEntryId },
      select: ledgerCaseSelect,
    });

    if (!entry) {
      return null;
    }

    const [relatedEntries, auditContext] = await Promise.all([
      this.prisma.ledgerEntryModel.findMany({
        where: {
          ledgerId: entry.ledgerId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: `asc` }, { id: `asc` }],
        select: relatedLedgerEntrySelect,
      }),
      entry.paymentRequestId == null
        ? Promise.resolve([] as AdminV2LedgerAuditContextRecord[])
        : this.prisma.adminActionAuditLogModel.findMany({
            where: {
              resourceId: entry.paymentRequestId,
            },
            include: adminActionAuditContextInclude,
            orderBy: [{ createdAt: `desc` }, { id: `desc` }],
            take: 20,
          }),
    ]);

    return {
      entry,
      relatedEntries,
      auditContext,
    };
  }

  async listDisputes(params: AdminV2LedgerDisputesQueryParams) {
    const { limit, cursor, search, paymentRequestId, consumerId, createdAt } = params;
    const where: Prisma.LedgerEntryDisputeModelWhereInput[] = [];

    if (createdAt) {
      where.push({ createdAt });
    }

    if (cursor) {
      where.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
        ],
      });
    }

    if (search) {
      where.push({
        OR: [
          { stripeDisputeId: { contains: search, mode: `insensitive` } },
          ...(isUuid(search) ? [{ id: search }, { ledgerEntryId: search }] : []),
        ],
      });
    }

    if (paymentRequestId || consumerId) {
      where.push({
        ledgerEntry: {
          ...(paymentRequestId ? { paymentRequestId } : {}),
          ...(consumerId ? { consumerId } : {}),
        },
      });
    }

    const rows = await this.prisma.ledgerEntryDisputeModel.findMany({
      where: where.length > 0 ? { AND: where } : {},
      include: ledgerDisputeInclude,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: limit + 1,
    });

    const next = rows[limit];
    return {
      rows: rows.slice(0, limit),
      nextCursorSource: next ? { createdAt: next.createdAt, id: next.id } : null,
    };
  }
}
