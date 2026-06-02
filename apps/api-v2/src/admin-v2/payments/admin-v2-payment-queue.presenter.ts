import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { type $Enums } from '@remoola/database-2';

import { type AdminV2PaymentsQueueRow } from './admin-v2-payments.query';

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

type PaymentOperationsQueueItemInput = {
  row: AdminV2PaymentsQueueRow;
  effectiveStatus: $Enums.TransactionStatus;
  paymentRail: $Enums.PaymentRail | null;
  assignedTo?: AdminRef | null;
};

type PaymentOperationsQueueItem = ReturnType<typeof mapPaymentOperationsQueueItem>;

type PaymentOperationsQueueInput = {
  now: Date;
  overdueItems: PaymentOperationsQueueItem[];
  uncollectibleItems: PaymentOperationsQueueItem[];
  staleApprovalItems: PaymentOperationsQueueItem[];
  inconsistentItems: PaymentOperationsQueueItem[];
  missingAttachmentItems: PaymentOperationsQueueItem[];
  assigneeMap: Map<string, AdminRef>;
};

export function isInvoiceTaggedResource(
  resource: { resourceTags?: Array<{ tag: { name: string } }> } | null | undefined,
): boolean {
  return resource?.resourceTags?.some((resourceTag) => resourceTag.tag.name.startsWith(`INVOICE-`)) ?? false;
}

export function mapPaymentOperationsQueueItem({
  row,
  effectiveStatus,
  paymentRail,
  assignedTo = null,
}: PaymentOperationsQueueItemInput) {
  const invoiceTaggedAttachmentsCount = row.attachments.filter((attachment) =>
    isInvoiceTaggedResource(attachment.resource),
  ).length;

  return {
    id: row.id,
    amount: row.amount.toString(),
    currencyCode: row.currencyCode,
    persistedStatus: row.status,
    effectiveStatus,
    staleWarning: effectiveStatus !== row.status,
    paymentRail,
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

export function mapPaymentOperationsQueue({
  now,
  overdueItems,
  uncollectibleItems,
  staleApprovalItems,
  inconsistentItems,
  missingAttachmentItems,
  assigneeMap,
}: PaymentOperationsQueueInput) {
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
        items: overdueItems.map((item) => ({
          ...item,
          followUpReason: `Due date passed while the payment request remains in an active review status`,
        })),
      },
      {
        key: `uncollectible_requests`,
        label: `UNCOLLECTIBLE requests`,
        operatorPrompt: UNCOLLECTIBLE_OPERATOR_PROMPT,
        items: uncollectibleItems.map((item) => ({
          ...item,
          followUpReason: `Payment request is marked UNCOLLECTIBLE and requires collections-focused review`,
        })),
      },
      {
        key: `stale_waiting_recipient_approval`,
        label: `Stale WAITING_RECIPIENT_APPROVAL`,
        operatorPrompt: STALE_WAITING_RECIPIENT_APPROVAL_OPERATOR_PROMPT,
        items: staleApprovalItems.map((item) => ({
          ...item,
          followUpReason: `Payment request remains in WAITING_RECIPIENT_APPROVAL beyond the current review window`,
        })),
      },
      {
        key: `inconsistent_status`,
        label: `Inconsistent status cases`,
        operatorPrompt: `Review cases where persisted request status and latest settlement status disagree.`,
        items: inconsistentItems
          .filter((item) => item.effectiveStatus !== item.persistedStatus)
          .slice(0, PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET)
          .map((item) => ({
            ...item,
            assignedTo: assigneeMap.get(item.id) ?? null,
            followUpReason: `Persisted payment status diverges from the latest settlement status`,
          })),
      },
      {
        key: `missing_attachment_or_invoice_linkage`,
        label: `Missing attachment or invoice linkage`,
        operatorPrompt: MISSING_ATTACHMENT_OPERATOR_PROMPT,
        items: missingAttachmentItems
          .filter((item) => item.attachmentsCount === 0 || item.invoiceTaggedAttachmentsCount === 0)
          .slice(0, PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET)
          .map((item) => ({
            ...item,
            assignedTo: assigneeMap.get(item.id) ?? null,
            followUpReason:
              item.attachmentsCount === 0
                ? `Payment request has no supporting attachment`
                : `Payment request has no invoice-tagged attachment linkage`,
          })),
      },
    ],
  };
}
