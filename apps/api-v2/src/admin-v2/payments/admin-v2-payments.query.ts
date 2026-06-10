import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import {
  type AdminV2PaymentsListRow,
  type AdminV2PaymentsQueueBuckets,
  type AdminV2PaymentsQueueRow,
  paymentAuditSelect,
  paymentCaseSelect,
} from './admin-v2-payments.query-definitions';
import {
  buildInconsistentQueueFindManyArgs,
  buildMissingAttachmentQueueFindManyArgs,
  buildOverdueQueueFindManyArgs,
  buildPaymentRequestListFindManyArgs,
  buildStaleApprovalQueueFindManyArgs,
  buildUncollectibleQueueFindManyArgs,
} from './admin-v2-payments.query-helpers';
import { PrismaService } from '../../shared/prisma.service';
export type { AdminV2PaymentsListRow, AdminV2PaymentsQueueRow };

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

  listPaymentRequests(params: ListPaymentRequestsParams): Promise<AdminV2PaymentsListRow[]> {
    return this.prisma.paymentRequestModel.findMany(buildPaymentRequestListFindManyArgs(params));
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
        this.prisma.paymentRequestModel.findMany(buildOverdueQueueFindManyArgs({ now, limitPerBucket })),
        this.prisma.paymentRequestModel.findMany(buildUncollectibleQueueFindManyArgs(limitPerBucket)),
        this.prisma.paymentRequestModel.findMany(
          buildStaleApprovalQueueFindManyArgs({
            staleWaitingRecipientApprovalThreshold,
            limitPerBucket,
          }),
        ),
        this.prisma.paymentRequestModel.findMany(buildInconsistentQueueFindManyArgs(limitPerBucket)),
        this.prisma.paymentRequestModel.findMany(buildMissingAttachmentQueueFindManyArgs(limitPerBucket)),
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
