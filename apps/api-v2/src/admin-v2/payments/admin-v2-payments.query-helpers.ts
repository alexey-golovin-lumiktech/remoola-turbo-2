import { $Enums, type Prisma } from '@remoola/database-2';

import {
  PAYMENT_OPERATIONS_OVERDUE_STATUSES,
  PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES,
  paymentListSelect,
  paymentOperationsQueueSelect,
} from './admin-v2-payments.query-definitions';
import { isUuid } from '../../shared/prisma-raw.utils';
import { buildCreatedAtIdCursorWhere, buildDateRangeFilter } from '../admin-v2-query.utils';

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

export function buildPaymentRequestListWhere(params: ListPaymentRequestsParams): Prisma.PaymentRequestModelWhereInput {
  const dueDateRange = buildDateRangeFilter(params.dueDateFrom, params.dueDateTo);
  const createdAtRange = buildDateRangeFilter(params.createdFrom, params.createdTo);

  return {
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
}

export function buildPaymentRequestListFindManyArgs(params: ListPaymentRequestsParams) {
  return {
    where: buildPaymentRequestListWhere(params),
    orderBy: [{ createdAt: `desc` }, { id: `desc` }],
    take: params.limit + 1,
    select: paymentListSelect,
  } satisfies Prisma.PaymentRequestModelFindManyArgs;
}

export function buildOverdueQueueFindManyArgs(params: { now: Date; limitPerBucket: number }) {
  return {
    where: {
      deletedAt: null,
      dueDate: { lt: params.now },
      status: { in: [...PAYMENT_OPERATIONS_OVERDUE_STATUSES] },
    },
    orderBy: [{ dueDate: `asc` }, { updatedAt: `desc` }, { id: `desc` }],
    take: params.limitPerBucket,
    select: paymentOperationsQueueSelect,
  } satisfies Prisma.PaymentRequestModelFindManyArgs;
}

export function buildUncollectibleQueueFindManyArgs(limitPerBucket: number) {
  return {
    where: {
      deletedAt: null,
      status: $Enums.TransactionStatus.UNCOLLECTIBLE,
    },
    orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
    take: limitPerBucket,
    select: paymentOperationsQueueSelect,
  } satisfies Prisma.PaymentRequestModelFindManyArgs;
}

export function buildStaleApprovalQueueFindManyArgs(params: {
  staleWaitingRecipientApprovalThreshold: Date;
  limitPerBucket: number;
}) {
  return {
    where: {
      deletedAt: null,
      status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
      updatedAt: { lte: params.staleWaitingRecipientApprovalThreshold },
    },
    orderBy: [{ dueDate: `asc` }, { updatedAt: `asc` }, { id: `desc` }],
    take: params.limitPerBucket,
    select: paymentOperationsQueueSelect,
  } satisfies Prisma.PaymentRequestModelFindManyArgs;
}

export function buildInconsistentQueueFindManyArgs(limitPerBucket: number) {
  return {
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
  } satisfies Prisma.PaymentRequestModelFindManyArgs;
}

export function buildMissingAttachmentQueueFindManyArgs(limitPerBucket: number) {
  return {
    where: {
      deletedAt: null,
    },
    orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
    take: limitPerBucket * 3,
    select: paymentOperationsQueueSelect,
  } satisfies Prisma.PaymentRequestModelFindManyArgs;
}
