import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerDocumentAccessPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async assertDraftOwnedPaymentRequest(consumerId: string, paymentRequestId: string) {
    const normalizedPaymentRequestId = paymentRequestId.trim();
    if (!normalizedPaymentRequestId) {
      throw new BadRequestException(`Payment request id is required`);
    }

    const payment = await this.prisma.paymentRequestModel.findFirst({
      where: {
        id: normalizedPaymentRequestId,
        requesterId: consumerId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payment) {
      throw new ForbiddenException(errorCodes.PAYMENT_NOT_OWNED);
    }

    if (payment.status !== $Enums.TransactionStatus.DRAFT) {
      throw new BadRequestException(`Only draft payment requests can accept attachments`);
    }

    return payment;
  }
}
