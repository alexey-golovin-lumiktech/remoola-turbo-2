import { $Enums, Prisma } from '@remoola/database-2';

export const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;

export const PAYMENT_OPERATIONS_OVERDUE_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
  $Enums.TransactionStatus.PENDING,
] as const;

export const paymentListSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
  id: true,
  amount: true,
  currencyCode: true,
  status: true,
  paymentRail: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  payer: { select: { id: true, email: true } },
  requester: { select: { id: true, email: true } },
  payerEmail: true,
  requesterEmail: true,
  attachments: {
    where: { deletedAt: null },
    select: { id: true },
  },
  ledgerEntries: {
    where: {
      deletedAt: null,
      type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
    },
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 4,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      metadata: true,
      outcomes: {
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 1,
        select: { status: true },
      },
    },
  },
});

export const paymentCaseSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
  id: true,
  amount: true,
  currencyCode: true,
  status: true,
  paymentRail: true,
  description: true,
  dueDate: true,
  sentDate: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  payer: { select: { id: true, email: true } },
  requester: { select: { id: true, email: true } },
  payerEmail: true,
  requesterEmail: true,
  attachments: {
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    select: {
      id: true,
      createdAt: true,
      deletedAt: true,
      resource: {
        select: {
          id: true,
          originalName: true,
          size: true,
          mimetype: true,
          downloadUrl: true,
          createdAt: true,
          deletedAt: true,
        },
      },
    },
  },
  ledgerEntries: {
    orderBy: [{ createdAt: `asc` }, { id: `asc` }],
    select: {
      id: true,
      ledgerId: true,
      type: true,
      amount: true,
      currencyCode: true,
      status: true,
      createdAt: true,
      deletedAt: true,
      metadata: true,
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
    },
  },
});

export const paymentAuditSelect = Prisma.validator<Prisma.AdminActionAuditLogModelFindManyArgs>()({
  include: {
    admin: {
      select: {
        email: true,
      },
    },
  },
  orderBy: [{ createdAt: `desc` }, { id: `desc` }],
  take: 20,
});

export const paymentOperationsQueueSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
  id: true,
  amount: true,
  currencyCode: true,
  status: true,
  paymentRail: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  payer: { select: { id: true, email: true } },
  requester: { select: { id: true, email: true } },
  payerEmail: true,
  requesterEmail: true,
  attachments: {
    where: { deletedAt: null, resource: { deletedAt: null } },
    select: {
      id: true,
      resource: {
        select: {
          id: true,
          resourceTags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
  ledgerEntries: {
    where: {
      deletedAt: null,
      type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
    },
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: 4,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      outcomes: {
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 1,
        select: { status: true },
      },
    },
  },
});

export type AdminV2PaymentsListRow = Prisma.PaymentRequestModelGetPayload<{
  select: typeof paymentListSelect;
}>;

export type AdminV2PaymentsQueueRow = Prisma.PaymentRequestModelGetPayload<{
  select: typeof paymentOperationsQueueSelect;
}>;

export type AdminV2PaymentsQueueBuckets = {
  overdueRows: AdminV2PaymentsQueueRow[];
  uncollectibleRows: AdminV2PaymentsQueueRow[];
  staleApprovalRows: AdminV2PaymentsQueueRow[];
  inconsistentRows: AdminV2PaymentsQueueRow[];
  missingAttachmentRows: AdminV2PaymentsQueueRow[];
};
