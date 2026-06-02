import { Injectable } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef, type AdminV2AssignmentContext } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { mapPaymentRequestCase as mapPaymentRequestCaseModel } from './admin-v2-payment-case.presenter';
import {
  mapPaymentOperationsQueue as mapPaymentOperationsQueueModel,
  mapPaymentOperationsQueueItem as mapPaymentOperationsQueueItemModel,
} from './admin-v2-payment-queue.presenter';
import {
  derivePaymentRail as derivePaymentRailPolicy,
  getEffectivePaymentStatus as getEffectivePaymentStatusPolicy,
} from './admin-v2-payment-status.presenter';
import {
  AdminV2PaymentsQuery,
  type AdminV2PaymentsListRow,
  type AdminV2PaymentsQueueRow,
} from './admin-v2-payments.query';

type PaymentRequestCaseRow = NonNullable<Awaited<ReturnType<AdminV2PaymentsQuery[`getPaymentRequestCase`]>>>;
type PaymentAuditContextRow = Awaited<ReturnType<AdminV2PaymentsQuery[`getPaymentRequestAuditContext`]>>[number];

@Injectable()
export class AdminV2PaymentsPresenter {
  getEffectivePaymentStatus(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            type: $Enums.LedgerEntryType;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    return getEffectivePaymentStatusPolicy(paymentRequest);
  }

  derivePaymentRail(
    paymentRequest:
      | {
          paymentRail?: $Enums.PaymentRail | null;
          ledgerEntries?: Array<{
            type: $Enums.LedgerEntryType;
            metadata?: Prisma.JsonValue | null;
          }>;
        }
      | null
      | undefined,
  ): $Enums.PaymentRail | null {
    return derivePaymentRailPolicy(paymentRequest);
  }

  mapPaymentListItem(row: AdminV2PaymentsListRow) {
    const effectiveStatus = this.getEffectivePaymentStatus(row) ?? row.status;

    return {
      id: row.id,
      amount: row.amount.toString(),
      currencyCode: row.currencyCode,
      persistedStatus: row.status,
      effectiveStatus,
      staleWarning: effectiveStatus !== row.status,
      paymentRail: this.derivePaymentRail(row),
      payer: {
        id: row.payer?.id ?? null,
        email: row.payer?.email ?? row.payerEmail ?? null,
      },
      requester: {
        id: row.requester?.id ?? null,
        email: row.requester?.email ?? row.requesterEmail ?? null,
      },
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      attachmentsCount: row.attachments.length,
      dataFreshnessClass: `bounded-snapshot`,
    };
  }

  mapPaymentRequestCase(
    paymentRequest: PaymentRequestCaseRow,
    auditContext: PaymentAuditContextRow[],
    assignment: AdminV2AssignmentContext,
  ) {
    const effectiveStatus = this.getEffectivePaymentStatus(paymentRequest) ?? paymentRequest.status;
    const paymentRail = this.derivePaymentRail(paymentRequest);

    return mapPaymentRequestCaseModel({
      paymentRequest,
      auditContext,
      assignment,
      effectiveStatus,
      paymentRail,
    });
  }

  mapPaymentOperationsQueueItem(row: AdminV2PaymentsQueueRow, assignedTo: AdminRef | null = null) {
    const effectiveStatus = this.getEffectivePaymentStatus(row) ?? row.status;
    const paymentRail = this.derivePaymentRail(row);

    return mapPaymentOperationsQueueItemModel({
      row,
      effectiveStatus,
      paymentRail,
      assignedTo,
    });
  }

  mapPaymentOperationsQueue(params: {
    now: Date;
    overdueRows: AdminV2PaymentsQueueRow[];
    uncollectibleRows: AdminV2PaymentsQueueRow[];
    staleApprovalRows: AdminV2PaymentsQueueRow[];
    inconsistentRows: AdminV2PaymentsQueueRow[];
    missingAttachmentRows: AdminV2PaymentsQueueRow[];
    assigneeMap: Map<string, AdminRef>;
  }) {
    const { now, overdueRows, uncollectibleRows, staleApprovalRows, inconsistentRows, missingAttachmentRows } = params;
    const assigneeMap = params.assigneeMap;

    return mapPaymentOperationsQueueModel({
      now,
      overdueItems: overdueRows.map((row) => this.mapPaymentOperationsQueueItem(row, assigneeMap.get(row.id) ?? null)),
      uncollectibleItems: uncollectibleRows.map((row) =>
        this.mapPaymentOperationsQueueItem(row, assigneeMap.get(row.id) ?? null),
      ),
      staleApprovalItems: staleApprovalRows.map((row) =>
        this.mapPaymentOperationsQueueItem(row, assigneeMap.get(row.id) ?? null),
      ),
      inconsistentItems: inconsistentRows.map((row) => this.mapPaymentOperationsQueueItem(row)),
      missingAttachmentItems: missingAttachmentRows.map((row) => this.mapPaymentOperationsQueueItem(row)),
      assigneeMap,
    });
  }
}
