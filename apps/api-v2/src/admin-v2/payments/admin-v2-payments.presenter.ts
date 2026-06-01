import { Injectable } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef, type AdminV2AssignmentContext } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { mapPaymentRequestCase as mapPaymentRequestCaseModel } from './admin-v2-payment-case.presenter';
import {
  derivePaymentRail as derivePaymentRailPolicy,
  getEffectivePaymentStatus as getEffectivePaymentStatusPolicy,
} from './admin-v2-payment-status.presenter';
import {
  AdminV2PaymentsQuery,
  type AdminV2PaymentsListRow,
  type AdminV2PaymentsQueueRow,
} from './admin-v2-payments.query';

const PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET = 25;
const OVERDUE_OPERATOR_PROMPT = [
  `Review overdue payment requests and continue investigation`,
  `from the payment detail view.`,
].join(` `);
const MISSING_ATTACHMENT_OPERATOR_PROMPT = [
  `Review cases with missing supporting attachments`,
  `or missing invoice-tagged attachment links.`,
].join(` `);
const UNCOLLECTIBLE_OPERATOR_PROMPT = [
  `Review UNCOLLECTIBLE payment requests as a separate collections outcome`,
  `before continuing from the payment detail view.`,
].join(` `);
const STALE_WAITING_RECIPIENT_APPROVAL_OPERATOR_PROMPT = [
  `Review payment requests that remain in WAITING_RECIPIENT_APPROVAL`,
  `beyond the current review window.`,
].join(` `);

type PaymentRequestCaseRow = NonNullable<Awaited<ReturnType<AdminV2PaymentsQuery[`getPaymentRequestCase`]>>>;
type PaymentAuditContextRow = Awaited<ReturnType<AdminV2PaymentsQuery[`getPaymentRequestAuditContext`]>>[number];

@Injectable()
export class AdminV2PaymentsPresenter {
  private isInvoiceTaggedResource(
    resource: { resourceTags?: Array<{ tag: { name: string } }> } | null | undefined,
  ): boolean {
    return resource?.resourceTags?.some((resourceTag) => resourceTag.tag.name.startsWith(`INVOICE-`)) ?? false;
  }

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
    const invoiceTaggedAttachmentsCount = row.attachments.filter((attachment) =>
      this.isInvoiceTaggedResource(attachment.resource),
    ).length;

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
      invoiceTaggedAttachmentsCount,
      dataFreshnessClass: `bounded-snapshot`,
      assignedTo,
    };
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
    const inconsistentItems = inconsistentRows
      .map((row) => this.mapPaymentOperationsQueueItem(row))
      .filter((row) => row.effectiveStatus !== row.persistedStatus)
      .slice(0, PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET)
      .map((row) => ({
        ...row,
        followUpReason: `Persisted payment status diverges from the latest settlement status`,
      }));

    const missingAttachmentItems = missingAttachmentRows
      .map((row) => this.mapPaymentOperationsQueueItem(row))
      .filter((row) => row.attachmentsCount === 0 || row.invoiceTaggedAttachmentsCount === 0)
      .slice(0, PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET)
      .map((row) => ({
        ...row,
        followUpReason:
          row.attachmentsCount === 0
            ? `Payment request has no supporting attachment`
            : `Payment request has no invoice-tagged attachment linkage`,
      }));

    return {
      generatedAt: now,
      posture: {
        kind: `non_sla_follow_up_queue`,
        wording: `Manual review queue`,
      },
      buckets: [
        {
          key: `overdue_requests`,
          label: `Overdue requests`,
          operatorPrompt: OVERDUE_OPERATOR_PROMPT,
          items: overdueRows.map((row) => ({
            ...this.mapPaymentOperationsQueueItem(row, assigneeMap.get(row.id) ?? null),
            followUpReason: `Due date passed while the payment request remains in an active review status`,
          })),
        },
        {
          key: `uncollectible_requests`,
          label: `UNCOLLECTIBLE requests`,
          operatorPrompt: UNCOLLECTIBLE_OPERATOR_PROMPT,
          items: uncollectibleRows.map((row) => ({
            ...this.mapPaymentOperationsQueueItem(row, assigneeMap.get(row.id) ?? null),
            followUpReason: `Payment request is marked UNCOLLECTIBLE and requires collections-focused review`,
          })),
        },
        {
          key: `stale_waiting_recipient_approval`,
          label: `Stale WAITING_RECIPIENT_APPROVAL`,
          operatorPrompt: STALE_WAITING_RECIPIENT_APPROVAL_OPERATOR_PROMPT,
          items: staleApprovalRows.map((row) => ({
            ...this.mapPaymentOperationsQueueItem(row, assigneeMap.get(row.id) ?? null),
            followUpReason: `Payment request remains in WAITING_RECIPIENT_APPROVAL beyond the current review window`,
          })),
        },
        {
          key: `inconsistent_status`,
          label: `Inconsistent status cases`,
          operatorPrompt: `Review cases where persisted request status and latest settlement status disagree.`,
          items: inconsistentItems.map((item) => ({
            ...item,
            assignedTo: assigneeMap.get(item.id) ?? null,
          })),
        },
        {
          key: `missing_attachment_or_invoice_linkage`,
          label: `Missing attachment or invoice linkage`,
          operatorPrompt: MISSING_ATTACHMENT_OPERATOR_PROMPT,
          items: missingAttachmentItems.map((item) => ({
            ...item,
            assignedTo: assigneeMap.get(item.id) ?? null,
          })),
        },
      ],
    };
  }
}
