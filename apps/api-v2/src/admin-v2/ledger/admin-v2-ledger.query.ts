import { Injectable } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';

import {
  buildLedgerAuditContextFindManyArgs,
  buildLedgerCaseFindUniqueArgs,
  buildLedgerDisputesFindManyArgs,
  buildLedgerListFindManyArgs,
  buildRelatedLedgerEntriesFindManyArgs,
  buildRawPageNextCursor,
  buildStatusHydrationFindManyArgs,
  buildStatusFilteredLedgerPageIdsSql,
  parsePageIdRows,
  sortLedgerRowsToPageOrder,
  type AmountSignFilter,
  type LedgerCursor,
} from './admin-v2-ledger-query-helpers';
import {
  type AdminV2LedgerAuditContextRecord,
  type AdminV2LedgerCaseRecord,
  type AdminV2LedgerDisputeRow,
  type AdminV2LedgerListItemRecord,
} from './admin-v2-ledger.query-definitions';
import { PrismaService } from '../../shared/prisma.service';

export type { AdminV2LedgerCaseRecord, AdminV2LedgerDisputeRow, AdminV2LedgerListItemRecord };

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

  async listLedgerEntries(params: AdminV2LedgerListQueryParams): Promise<{
    rows: AdminV2LedgerListItemRecord[];
    nextCursorSource: LedgerCursor;
  }> {
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
          : await this.prisma.ledgerEntryModel.findMany(buildStatusHydrationFindManyArgs(pageIds));

      return {
        rows: sortLedgerRowsToPageOrder(pageIds, rows),
        nextCursorSource: buildRawPageNextCursor(pageIdRows, limit),
      };
    }

    const rows = await this.prisma.ledgerEntryModel.findMany(
      buildLedgerListFindManyArgs({
        limit,
        cursor,
        search,
        type,
        currencyCode,
        paymentRequestId,
        consumerId,
        amountSign,
        createdAt,
      }),
    );

    const next = rows[limit];
    return {
      rows: rows.slice(0, limit),
      nextCursorSource: next ? { createdAt: next.createdAt, id: next.id } : null,
    };
  }

  async getLedgerEntryCase(ledgerEntryId: string): Promise<AdminV2LedgerCaseRecord | null> {
    const entry = await this.prisma.ledgerEntryModel.findUnique(buildLedgerCaseFindUniqueArgs(ledgerEntryId));

    if (!entry) {
      return null;
    }

    const [relatedEntries, auditContext] = await Promise.all([
      this.prisma.ledgerEntryModel.findMany(buildRelatedLedgerEntriesFindManyArgs(entry.ledgerId)),
      entry.paymentRequestId == null
        ? Promise.resolve([] as AdminV2LedgerAuditContextRecord[])
        : this.prisma.adminActionAuditLogModel.findMany(buildLedgerAuditContextFindManyArgs(entry.paymentRequestId)),
    ]);

    return {
      entry,
      relatedEntries,
      auditContext,
    };
  }

  async listDisputes(params: AdminV2LedgerDisputesQueryParams): Promise<{
    rows: AdminV2LedgerDisputeRow[];
    nextCursorSource: LedgerCursor;
  }> {
    const { limit, cursor, search, paymentRequestId, consumerId, createdAt } = params;
    const rows = await this.prisma.ledgerEntryDisputeModel.findMany(
      buildLedgerDisputesFindManyArgs({
        limit,
        cursor,
        search,
        paymentRequestId,
        consumerId,
        createdAt,
      }),
    );

    const next = rows[limit];
    return {
      rows: rows.slice(0, limit),
      nextCursorSource: next ? { createdAt: next.createdAt, id: next.id } : null,
    };
  }
}
