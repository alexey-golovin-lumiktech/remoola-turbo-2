import { Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PaymentsQuery, type AdminV2PaymentsQueueRow } from './admin-v2-payments.query';
import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SEARCH_MAX_LENGTH = 200;
const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;
const PAYMENT_OPERATIONS_QUEUE_LIMIT_PER_BUCKET = 25;
const STALE_WAITING_RECIPIENT_APPROVAL_THRESHOLD_HOURS = 24;
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
  ) {}

  private isInvoiceTaggedResource(
    resource: { resourceTags?: Array<{ tag: { name: string } }> } | null | undefined,
  ): boolean {
    return resource?.resourceTags?.some((resourceTag) => resourceTag.tag.name.startsWith(`INVOICE-`)) ?? false;
  }

  private mapPaymentOperationsQueueItem(row: AdminV2PaymentsQueueRow, assignedTo: AdminRef | null = null) {
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

  private getLatestSettlementEntry(
    paymentRequest:
      | {
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            type: $Enums.LedgerEntryType;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ) {
    return [...(paymentRequest?.ledgerEntries ?? [])]
      .filter((entry) =>
        PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES.includes(
          entry.type as (typeof PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES)[number],
        ),
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  private getEffectivePaymentStatus(
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
    if (!paymentRequest) {
      return null;
    }

    const latestEntry = this.getLatestSettlementEntry(paymentRequest);
    return latestEntry ? getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
  }

  private derivePaymentRail(
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
    if (!paymentRequest) {
      return null;
    }

    if (paymentRequest.paymentRail) {
      return paymentRequest.paymentRail;
    }

    for (const entry of paymentRequest.ledgerEntries ?? []) {
      const metadata = JSON.parse(JSON.stringify(entry.metadata ?? {})) as { rail?: $Enums.PaymentRail | null };
      if (metadata.rail) {
        return metadata.rail;
      }
    }

    return null;
  }

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

    const items = rows.slice(0, limit).map((row) => {
      const effectiveStatus = this.getEffectivePaymentStatus(row) ?? row.status;
      const rail = this.derivePaymentRail(row);

      return {
        id: row.id,
        amount: row.amount.toString(),
        currencyCode: row.currencyCode,
        persistedStatus: row.status,
        effectiveStatus,
        staleWarning: effectiveStatus !== row.status,
        paymentRail: rail,
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
    });

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `payment_request`,
      items.map((item) => item.id),
    );

    const itemsWithAssignee = items.map((item) => ({
      ...item,
      assignedTo: (assigneeMap.get(item.id) ?? null) as AdminRef | null,
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

    const effectiveStatus = this.getEffectivePaymentStatus(paymentRequest) ?? paymentRequest.status;
    const timeline = [
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

    const [auditContext, assignment] = await Promise.all([
      this.query.getPaymentRequestAuditContext(paymentRequest.id),
      this.assignmentsService.getAssignmentContextForResource(`payment_request`, paymentRequest.id),
    ]);

    return {
      id: paymentRequest.id,
      core: {
        id: paymentRequest.id,
        amount: paymentRequest.amount.toString(),
        currencyCode: paymentRequest.currencyCode,
        persistedStatus: paymentRequest.status,
        effectiveStatus,
        paymentRail: this.derivePaymentRail(paymentRequest),
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
      timeline,
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

    const itemIdSet = new Set<string>();
    for (const row of overdueRows) itemIdSet.add(row.id);
    for (const row of uncollectibleRows) itemIdSet.add(row.id);
    for (const row of staleApprovalRows) itemIdSet.add(row.id);
    for (const item of inconsistentItems) itemIdSet.add(item.id);
    for (const item of missingAttachmentItems) itemIdSet.add(item.id);

    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(`payment_request`, [...itemIdSet]);

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
