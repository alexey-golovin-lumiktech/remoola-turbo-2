import { type AdminV2AssignmentContext } from '@remoola/api-types';
import { type $Enums } from '@remoola/database-2';

import { type AdminV2PaymentsQuery } from './admin-v2-payments.query';
import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';

type PaymentRequestCaseRow = NonNullable<Awaited<ReturnType<AdminV2PaymentsQuery[`getPaymentRequestCase`]>>>;
type PaymentAuditContextRow = Awaited<ReturnType<AdminV2PaymentsQuery[`getPaymentRequestAuditContext`]>>[number];

type PaymentRequestCasePresenterInput = {
  paymentRequest: PaymentRequestCaseRow;
  auditContext: PaymentAuditContextRow[];
  assignment: AdminV2AssignmentContext;
  effectiveStatus: $Enums.TransactionStatus;
  paymentRail: $Enums.PaymentRail | null;
};

function buildPaymentRequestTimeline(paymentRequest: PaymentRequestCaseRow) {
  return [
    {
      event: `payment_request_created`,
      timestamp: paymentRequest.createdAt,
      metadata: {
        persistedStatus: paymentRequest.status,
        amount: paymentRequest.amount.toString(),
        currencyCode: paymentRequest.currencyCode,
      },
    },
    ...(paymentRequest.sentDate
      ? [
          {
            event: `payment_request_sent`,
            timestamp: paymentRequest.sentDate,
            metadata: null,
          },
        ]
      : []),
    ...(paymentRequest.dueDate
      ? [
          {
            event: `payment_request_due`,
            timestamp: paymentRequest.dueDate,
            metadata: null,
          },
        ]
      : []),
    ...paymentRequest.attachments.map((attachment) => ({
      event: `attachment_added`,
      timestamp: attachment.createdAt,
      metadata: {
        attachmentId: attachment.id,
        resourceId: attachment.resource.id,
        name: attachment.resource.originalName,
        deletedAt: attachment.deletedAt,
        resourceDeletedAt: attachment.resource.deletedAt,
      },
    })),
    ...paymentRequest.ledgerEntries.flatMap((entry) => [
      {
        event: `ledger_entry_created`,
        timestamp: entry.createdAt,
        metadata: {
          ledgerEntryId: entry.id,
          ledgerId: entry.ledgerId,
          type: entry.type,
          amount: entry.amount.toString(),
          currencyCode: entry.currencyCode,
          deletedAt: entry.deletedAt,
        },
      },
      ...entry.outcomes.map((outcome) => ({
        event: `ledger_outcome_recorded`,
        timestamp: outcome.createdAt,
        metadata: {
          ledgerEntryId: entry.id,
          outcomeId: outcome.id,
          status: outcome.status,
          source: outcome.source,
          externalId: outcome.externalId,
        },
      })),
    ]),
  ].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

export function mapPaymentRequestCase({
  paymentRequest,
  auditContext,
  assignment,
  effectiveStatus,
  paymentRail,
}: PaymentRequestCasePresenterInput) {
  return {
    id: paymentRequest.id,
    core: {
      id: paymentRequest.id,
      amount: paymentRequest.amount.toString(),
      currencyCode: paymentRequest.currencyCode,
      persistedStatus: paymentRequest.status,
      effectiveStatus,
      paymentRail,
      description: paymentRequest.description,
      dueDate: paymentRequest.dueDate,
      sentDate: paymentRequest.sentDate,
      createdAt: paymentRequest.createdAt,
      deletedAt: paymentRequest.deletedAt,
    },
    payer: {
      id: paymentRequest.payer?.id ?? null,
      email: paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? null,
    },
    requester: {
      id: paymentRequest.requester?.id ?? null,
      email: paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? null,
    },
    attachments: paymentRequest.attachments.map((attachment) => ({
      id: attachment.id,
      resourceId: attachment.resource.id,
      name: attachment.resource.originalName,
      size: attachment.resource.size,
      mimetype: attachment.resource.mimetype,
      downloadUrl: attachment.resource.downloadUrl,
      createdAt: attachment.resource.createdAt,
      deletedAt: attachment.deletedAt,
      resourceDeletedAt: attachment.resource.deletedAt,
    })),
    ledgerEntries: paymentRequest.ledgerEntries.map((entry) => ({
      id: entry.id,
      ledgerId: entry.ledgerId,
      type: entry.type,
      amount: entry.amount.toString(),
      currencyCode: entry.currencyCode,
      effectiveStatus: getEffectiveLedgerStatus(entry),
      createdAt: entry.createdAt,
      deletedAt: entry.deletedAt,
    })),
    timeline: buildPaymentRequestTimeline(paymentRequest),
    auditContext: auditContext.map((row) => ({
      id: row.id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resourceId,
      adminEmail: row.admin?.email ?? null,
      createdAt: row.createdAt,
    })),
    assignment,
    version: paymentRequest.updatedAt.getTime(),
    updatedAt: paymentRequest.updatedAt,
    staleWarning: effectiveStatus !== paymentRequest.status,
    dataFreshnessClass: `exact`,
  };
}
