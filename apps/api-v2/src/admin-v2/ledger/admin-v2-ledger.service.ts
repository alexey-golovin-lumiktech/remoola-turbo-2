import { Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { buildDateRangeFilter } from '../admin-v2-query.utils';
import {
  mapLedgerDisputeItem,
  mapLedgerEntryCase,
  mapLedgerListItem,
  normalizeAmountSign,
  normalizeEnumValue,
  normalizeLimit,
  normalizeSearch,
} from './admin-v2-ledger-read.helpers';
import { AdminV2LedgerQuery } from './admin-v2-ledger.query';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

@Injectable()
export class AdminV2LedgerService {
  constructor(
    private readonly query: AdminV2LedgerQuery,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

  async listLedgerEntries(params?: {
    cursor?: string;
    limit?: number;
    q?: string;
    type?: string;
    status?: string;
    currencyCode?: string;
    paymentRequestId?: string;
    consumerId?: string;
    amountSign?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const search = normalizeSearch(params?.q);
    const type = normalizeEnumValue(params?.type, Object.values($Enums.LedgerEntryType) as $Enums.LedgerEntryType[]);
    const status = normalizeEnumValue(
      params?.status,
      Object.values($Enums.TransactionStatus) as $Enums.TransactionStatus[],
    );
    const currencyCode = normalizeEnumValue(
      params?.currencyCode,
      Object.values($Enums.CurrencyCode) as $Enums.CurrencyCode[],
    );
    const amountSign = normalizeAmountSign(params?.amountSign);
    const createdAt = buildDateRangeFilter(params?.dateFrom, params?.dateTo);
    const { rows, nextCursorSource } = await this.query.listLedgerEntries({
      limit,
      cursor,
      search,
      type,
      status,
      currencyCode,
      paymentRequestId: params?.paymentRequestId,
      consumerId: params?.consumerId,
      amountSign,
      createdAt,
    });

    const items = rows.map((row) => mapLedgerListItem(row));

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `ledger_entry`,
      items.map((item) => item.id),
    );

    const itemsWithAssignee = items.map((item) => ({
      ...item,
      assignedTo: (assigneeMap.get(item.id) ?? null) as AdminRef | null,
    }));

    return {
      items: itemsWithAssignee,
      pageInfo: {
        nextCursor: nextCursorSource ? encodeAdminV2Cursor(nextCursorSource) : null,
        limit,
      },
    };
  }

  async getLedgerEntryCase(ledgerEntryId: string) {
    const ledgerCase = await this.query.getLedgerEntryCase(ledgerEntryId);
    if (!ledgerCase) {
      throw new NotFoundException(`Ledger entry not found`);
    }
    const { entry, relatedEntries, auditContext } = ledgerCase;

    const assignment = await this.assignmentsService.getAssignmentContextForResource(`ledger_entry`, entry.id);

    return mapLedgerEntryCase({ entry, relatedEntries, auditContext }, assignment);
  }

  async listDisputes(params?: {
    cursor?: string;
    limit?: number;
    paymentRequestId?: string;
    consumerId?: string;
    q?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const search = normalizeSearch(params?.q);
    const createdAt = buildDateRangeFilter(params?.dateFrom, params?.dateTo);
    const { rows, nextCursorSource } = await this.query.listDisputes({
      limit,
      cursor,
      search,
      paymentRequestId: params?.paymentRequestId,
      consumerId: params?.consumerId,
      createdAt,
    });
    return {
      items: rows.map((row) => mapLedgerDisputeItem(row)),
      pageInfo: {
        nextCursor: nextCursorSource ? encodeAdminV2Cursor(nextCursorSource) : null,
        limit,
      },
    };
  }
}
