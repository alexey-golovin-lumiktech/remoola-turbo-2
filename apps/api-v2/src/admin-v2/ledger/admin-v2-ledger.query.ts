import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  buildLedgerDisputesWhere,
  buildLedgerListWhere,
  buildRawPageNextCursor,
  buildStatusFilteredLedgerPageIdsSql,
  parsePageIdRows,
  sortLedgerRowsToPageOrder,
  type AmountSignFilter,
  type LedgerCursor,
} from './admin-v2-ledger-query-helpers';
import { PrismaService } from '../../shared/prisma.service';

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

    if (status) {
      const rawPageIdRows = await this.prisma.$queryRaw<unknown[]>(
        buildStatusFilteredLedgerPageIdsSql({
          limit,
          cursor,
          search,
          type,
          status,
          currencyCode,
          paymentRequestId,
          consumerId,
          amountSign,
          createdAt,
        }),
      );
      const pageIdRows = parsePageIdRows(rawPageIdRows);

      const pageIds = pageIdRows.slice(0, limit).map((row) => row.id);
      const rows: AdminV2LedgerListItemRecord[] =
        pageIds.length === 0
          ? []
          : await this.prisma.ledgerEntryModel.findMany({
              where: { id: { in: pageIds } },
              include: ledgerListInclude,
            });

      return {
        rows: sortLedgerRowsToPageOrder(pageIds, rows),
        nextCursorSource: buildRawPageNextCursor(pageIdRows, limit),
      };
    }

    const rows = await this.prisma.ledgerEntryModel.findMany({
      where: buildLedgerListWhere({
        cursor,
        search,
        type,
        currencyCode,
        paymentRequestId,
        consumerId,
        amountSign,
        createdAt,
      }),
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
    const rows = await this.prisma.ledgerEntryDisputeModel.findMany({
      where: buildLedgerDisputesWhere({
        cursor,
        search,
        paymentRequestId,
        consumerId,
        createdAt,
      }),
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
