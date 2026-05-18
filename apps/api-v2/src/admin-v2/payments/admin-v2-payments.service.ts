import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentsPresenter } from './admin-v2-payments.presenter';
import { AdminV2PaymentsQuery } from './admin-v2-payments.query';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SEARCH_MAX_LENGTH = 200;
const PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET = 25;
const STALE_WAITING_RECIPIENT_APPROVAL_THRESHOLD_HOURS = 24;

function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function normalizeSearch(q?: string): string | undefined {
  const search = q?.trim();
  return search ? search.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

function asNumber(value?: number): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

@Injectable()
export class AdminV2PaymentsService {
  constructor(
    private readonly query: AdminV2PaymentsQuery,
    private readonly assignmentsService: AdminV2AssignmentsService,
    private readonly presenter: AdminV2PaymentsPresenter,
  ) {}

  async listPaymentRequests(params?: {
    cursor?: string;
    limit?: number;
    q?: string;
    status?: string;
    paymentRail?: string;
    currencyCode?: string;
    amountMin?: number;
    amountMax?: number;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    createdFrom?: Date;
    createdTo?: Date;
    overdue?: boolean;
  }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const search = normalizeSearch(params?.q);
    const status = normalizeEnumValue(
      params?.status,
      Object.values($Enums.TransactionStatus) as $Enums.TransactionStatus[],
    );
    const paymentRail = normalizeEnumValue(
      params?.paymentRail,
      Object.values($Enums.PaymentRail) as $Enums.PaymentRail[],
    );
    const currencyCode = normalizeEnumValue(
      params?.currencyCode,
      Object.values($Enums.CurrencyCode) as $Enums.CurrencyCode[],
    );
    const amountMin = asNumber(params?.amountMin);
    const amountMax = asNumber(params?.amountMax);
    const now = new Date();

    const rows = await this.query.listPaymentRequests({
      cursor,
      limit,
      search,
      status,
      paymentRail,
      currencyCode,
      amountMin,
      amountMax,
      dueDateFrom: params?.dueDateFrom,
      dueDateTo: params?.dueDateTo,
      createdFrom: params?.createdFrom,
      createdTo: params?.createdTo,
      overdue: params?.overdue === true,
      now,
    });

    const items = rows.slice(0, limit).map((row) => this.presenter.mapPaymentListItem(row));

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `payment_request`,
      items.map((item) => item.id),
    );

    const itemsWithAssignee = items.map((item) => ({
      ...item,
      assignedTo: assigneeMap.get(item.id) ?? null,
    }));

    const next = rows[limit];
    return {
      items: itemsWithAssignee,
      pageInfo: {
        nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.createdAt, id: next.id }) : null,
        limit,
      },
    };
  }

  async getPaymentRequestCase(paymentRequestId: string) {
    const paymentRequest = await this.query.getPaymentRequestCase(paymentRequestId);

    if (!paymentRequest) {
      throw new NotFoundException(`Payment request not found`);
    }

    const [auditContext, assignment] = await Promise.all([
      this.query.getPaymentRequestAuditContext(paymentRequest.id),
      this.assignmentsService.getAssignmentContextForResource(`payment_request`, paymentRequest.id),
    ]);

    return this.presenter.mapPaymentRequestCase(paymentRequest, auditContext, assignment);
  }

  async getPaymentOperationsQueue() {
    const now = new Date();
    const staleWaitingRecipientApprovalThreshold = new Date(
      now.getTime() - STALE_WAITING_RECIPIENT_APPROVAL_THRESHOLD_HOURS * 60 * 60 * 1000,
    );
    const { overdueRows, uncollectibleRows, staleApprovalRows, inconsistentRows, missingAttachmentRows } =
      await this.query.getPaymentOperationsQueueBuckets({
        now,
        staleWaitingRecipientApprovalThreshold,
        limitPerBucket: PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET,
      });

    const itemIdSet = new Set<string>();
    for (const row of overdueRows) itemIdSet.add(row.id);
    for (const row of uncollectibleRows) itemIdSet.add(row.id);
    for (const row of staleApprovalRows) itemIdSet.add(row.id);
    for (const row of inconsistentRows) itemIdSet.add(row.id);
    for (const row of missingAttachmentRows) itemIdSet.add(row.id);

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(`payment_request`, [...itemIdSet]);

    return this.presenter.mapPaymentOperationsQueue({
      now,
      overdueRows,
      uncollectibleRows,
      staleApprovalRows,
      inconsistentRows,
      missingAttachmentRows,
      assigneeMap,
    });
  }
}
