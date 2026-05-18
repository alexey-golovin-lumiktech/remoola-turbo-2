import { Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { buildDateRangeFilter } from '../admin-v2-query.utils';
import { AdminV2LedgerQuery, type AdminV2LedgerListItemRecord } from './admin-v2-ledger.query';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SEARCH_MAX_LENGTH = 200;

function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function normalizeSearch(q?: string): string | undefined {
  const search = q?.trim();
  return search ? search.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

type AmountSignFilter = `positive` | `negative` | `zero`;

function normalizeAmountSign(value: string | undefined): AmountSignFilter | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === `positive` || normalized === `negative` || normalized === `zero` ? normalized : undefined;
}

@Injectable()
export class AdminV2LedgerService {
  constructor(
    private readonly query: AdminV2LedgerQuery,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

  private parseMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
  }

  private deriveRail(entry: {
    metadata?: Prisma.JsonValue | null;
    paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
  }): $Enums.PaymentRail | null {
    const metadata = this.parseMetadata(entry.metadata);
    return (metadata.rail as $Enums.PaymentRail | undefined) ?? entry.paymentRequest?.paymentRail ?? null;
  }

  private mapLedgerRow(entry: AdminV2LedgerListItemRecord) {
    const effectiveStatus = getEffectiveLedgerStatus(entry);
    return {
      id: entry.id,
      ledgerId: entry.ledgerId,
      type: entry.type,
      amount: entry.amount.toString(),
      currencyCode: entry.currencyCode,
      persistedStatus: entry.status,
      effectiveStatus,
      paymentRail: this.deriveRail(entry),
      consumerId: entry.consumerId,
      consumerEmail: entry.consumer?.email ?? null,
      paymentRequestId: entry.paymentRequestId,
      paymentRequestStatus: entry.paymentRequest?.status ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      disputeCount: entry.disputes?.length ?? 0,
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
    };
  }

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

    const items = rows.map((row) => this.mapLedgerRow(row));

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

    const effectiveStatus = getEffectiveLedgerStatus(entry);

    return {
      id: entry.id,
      core: {
        id: entry.id,
        ledgerId: entry.ledgerId,
        type: entry.type,
        amount: entry.amount.toString(),
        currencyCode: entry.currencyCode,
        persistedStatus: entry.status,
        effectiveStatus,
        paymentRail: this.deriveRail(entry),
        feesType: entry.feesType,
        feesAmount: entry.feesAmount?.toString() ?? null,
        stripeId: entry.stripeId,
        idempotencyKey: entry.idempotencyKey,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
      consumer: {
        id: entry.consumerId,
        email: entry.consumer?.email ?? null,
      },
      paymentRequest:
        entry.paymentRequest == null
          ? null
          : {
              id: entry.paymentRequest.id,
              amount: entry.paymentRequest.amount.toString(),
              currencyCode: entry.paymentRequest.currencyCode,
              status: entry.paymentRequest.status,
              paymentRail: entry.paymentRequest.paymentRail,
              payerId: entry.paymentRequest.payerId,
              payerEmail: entry.paymentRequest.payer?.email ?? null,
              requesterId: entry.paymentRequest.requesterId,
              requesterEmail: entry.paymentRequest.requester?.email ?? null,
            },
      metadata: this.parseMetadata(entry.metadata),
      outcomes: entry.outcomes.map((outcome) => ({
        id: outcome.id,
        status: outcome.status,
        source: outcome.source,
        externalId: outcome.externalId,
        createdAt: outcome.createdAt,
      })),
      disputes: entry.disputes.map((dispute) => ({
        id: dispute.id,
        stripeDisputeId: dispute.stripeDisputeId,
        metadata: this.parseMetadata(dispute.metadata),
        createdAt: dispute.createdAt,
      })),
      relatedEntries: relatedEntries.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount.toString(),
        currencyCode: item.currencyCode,
        effectiveStatus: getEffectiveLedgerStatus(item),
        createdAt: item.createdAt,
      })),
      auditContext: auditContext.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        adminEmail: row.admin?.email ?? null,
        createdAt: row.createdAt,
      })),
      assignment,
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
    };
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
      items: rows.map((row) => {
        const metadata = this.parseMetadata(row.metadata);
        return {
          id: row.id,
          stripeDisputeId: row.stripeDisputeId,
          disputeStatus:
            typeof metadata.status === `string`
              ? metadata.status
              : typeof metadata.disputeStatus === `string`
                ? metadata.disputeStatus
                : null,
          reason: typeof metadata.reason === `string` ? metadata.reason : null,
          amountMinor: typeof metadata.amount === `number` ? metadata.amount : null,
          updatedAt: typeof metadata.updatedAt === `string` ? metadata.updatedAt : null,
          createdAt: row.createdAt,
          metadata,
          ledgerEntry: {
            id: row.ledgerEntry.id,
            ledgerId: row.ledgerEntry.ledgerId,
            paymentRequestId: row.ledgerEntry.paymentRequestId,
            consumerId: row.ledgerEntry.consumerId,
            type: row.ledgerEntry.type,
            amount: row.ledgerEntry.amount.toString(),
            currencyCode: row.ledgerEntry.currencyCode,
            paymentRail: row.ledgerEntry.paymentRequest?.paymentRail ?? null,
          },
          dataFreshnessClass: `append-only-log`,
        };
      }),
      pageInfo: {
        nextCursor: nextCursorSource ? encodeAdminV2Cursor(nextCursorSource) : null,
        limit,
      },
    };
  }
}
