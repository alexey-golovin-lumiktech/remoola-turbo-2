import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { isUuid } from '../../shared/prisma-raw.utils';
import { PrismaService } from '../../shared/prisma.service';
import { buildCreatedAtIdCursorWhere, buildDateRangeFilter } from '../admin-v2-query.utils';

const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;

const PAYMENT_OPERATIONS_OVERDUE_STATUSES = [
  $Enums.TransactionStatus.WAITING,
  $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
  $Enums.TransactionStatus.PENDING,
] as const;

const paymentListSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
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

const paymentCaseSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
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

const paymentAuditSelect = Prisma.validator<Prisma.AdminActionAuditLogModelFindManyArgs>()({
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

const paymentOperationsQueueSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
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

type AdminV2PaymentsListRow = Prisma.PaymentRequestModelGetPayload<{
  select: typeof paymentListSelect;
}>;

export type AdminV2PaymentCaseRow = Prisma.PaymentRequestModelGetPayload<{
  select: typeof paymentCaseSelect;
}>;

export type AdminV2PaymentAuditRow = Prisma.AdminActionAuditLogModelGetPayload<typeof paymentAuditSelect>;

export type AdminV2PaymentsQueueRow = Prisma.PaymentRequestModelGetPayload<{
  select: typeof paymentOperationsQueueSelect;
}>;

type AdminV2PaymentsQueueBuckets = {
  overdueRows: AdminV2PaymentsQueueRow[];
  uncollectibleRows: AdminV2PaymentsQueueRow[];
  staleApprovalRows: AdminV2PaymentsQueueRow[];
  inconsistentRows: AdminV2PaymentsQueueRow[];
  missingAttachmentRows: AdminV2PaymentsQueueRow[];
};

type ListPaymentRequestsParams = {
  cursor: { createdAt: Date; id: string } | null;
  limit: number;
  search?: string;
  status?: $Enums.TransactionStatus;
  paymentRail?: $Enums.PaymentRail;
  currencyCode?: $Enums.CurrencyCode;
  amountMin?: number;
  amountMax?: number;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
  overdue?: boolean;
  now: Date;
};

@Injectable()
export class AdminV2PaymentsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listPaymentRequests(params: ListPaymentRequestsParams): Promise<AdminV2PaymentsListRow[]> {
    const dueDateRange = buildDateRangeFilter(params.dueDateFrom, params.dueDateTo);
    const createdAtRange = buildDateRangeFilter(params.createdFrom, params.createdTo);

    const where: Prisma.PaymentRequestModelWhereInput = {
      deletedAt: null,
      ...buildCreatedAtIdCursorWhere(params.cursor),
      ...(params.status ? { status: params.status } : {}),
      ...(params.paymentRail ? { paymentRail: params.paymentRail } : {}),
      ...(params.currencyCode ? { currencyCode: params.currencyCode } : {}),
      ...(params.amountMin != null || params.amountMax != null
        ? {
            amount: {
              ...(params.amountMin != null ? { gte: params.amountMin } : {}),
              ...(params.amountMax != null ? { lte: params.amountMax } : {}),
            },
          }
        : {}),
      ...(dueDateRange ? { dueDate: dueDateRange } : {}),
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
      ...(params.overdue === true
        ? {
            dueDate: {
              ...(dueDateRange ?? {}),
              lt: params.now,
            },
            status: {
              in: [...PAYMENT_OPERATIONS_OVERDUE_STATUSES],
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              ...(isUuid(params.search) ? [{ id: params.search }] : []),
              { description: { contains: params.search, mode: `insensitive` } },
              { payerEmail: { contains: params.search, mode: `insensitive` } },
              { requesterEmail: { contains: params.search, mode: `insensitive` } },
              { payer: { email: { contains: params.search, mode: `insensitive` } } },
              { requester: { email: { contains: params.search, mode: `insensitive` } } },
            ],
          }
        : {}),
    };

    return this.prisma.paymentRequestModel.findMany({
      where,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: params.limit + 1,
      select: paymentListSelect,
    });
  }

  getPaymentRequestCase(paymentRequestId: string) {
    return this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      select: paymentCaseSelect,
    });
  }

  getPaymentRequestAuditContext(paymentRequestId: string) {
    return this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resourceId: paymentRequestId,
      },
      ...paymentAuditSelect,
    });
  }

  async getPaymentOperationsQueueBuckets(params: {
    now: Date;
    staleWaitingRecipientApprovalThreshold: Date;
    limitPerBucket: number;
  }): Promise<AdminV2PaymentsQueueBuckets> {
    const { now, staleWaitingRecipientApprovalThreshold, limitPerBucket } = params;

    const [overdueRows, uncollectibleRows, staleApprovalRows, inconsistentRows, missingAttachmentRows] =
      await Promise.all([
        this.prisma.paymentRequestModel.findMany({
          where: {
            deletedAt: null,
            dueDate: { lt: now },
            status: { in: [...PAYMENT_OPERATIONS_OVERDUE_STATUSES] },
          },
          orderBy: [{ dueDate: `asc` }, { updatedAt: `desc` }, { id: `desc` }],
          take: limitPerBucket,
          select: paymentOperationsQueueSelect,
        }),
        this.prisma.paymentRequestModel.findMany({
          where: {
            deletedAt: null,
            status: $Enums.TransactionStatus.UNCOLLECTIBLE,
          },
          orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
          take: limitPerBucket,
          select: paymentOperationsQueueSelect,
        }),
        this.prisma.paymentRequestModel.findMany({
          where: {
            deletedAt: null,
            status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
            updatedAt: { lte: staleWaitingRecipientApprovalThreshold },
          },
          orderBy: [{ dueDate: `asc` }, { updatedAt: `asc` }, { id: `desc` }],
          take: limitPerBucket,
          select: paymentOperationsQueueSelect,
        }),
        this.prisma.paymentRequestModel.findMany({
          where: {
            deletedAt: null,
            ledgerEntries: {
              some: {
                deletedAt: null,
                type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
              },
            },
          },
          orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
          take: limitPerBucket * 3,
          select: paymentOperationsQueueSelect,
        }),
        this.prisma.paymentRequestModel.findMany({
          where: {
            deletedAt: null,
          },
          orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
          take: limitPerBucket * 3,
          select: paymentOperationsQueueSelect,
        }),
      ]);

    return {
      overdueRows,
      uncollectibleRows,
      staleApprovalRows,
      inconsistentRows,
      missingAttachmentRows,
    };
  }
}
