import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerDocumentRepository } from './consumer-document.repository';

@Injectable()
export class ConsumerDocumentAccessPolicy {
  constructor(private readonly documentRepository: ConsumerDocumentRepository) {}

  async assertDraftOwnedPaymentRequest(consumerId: string, paymentRequestId: string) {
    const normalizedPaymentRequestId = paymentRequestId.trim();
    if (!normalizedPaymentRequestId) {
      throw new BadRequestException(`Payment request id is required`);
    }

    const payment = await this.documentRepository.findOwnedDraftPaymentRequest(consumerId, normalizedPaymentRequestId);

    if (!payment) {
      throw new ForbiddenException(errorCodes.PAYMENT_NOT_OWNED);
    }

    if (payment.status !== $Enums.TransactionStatus.DRAFT) {
      throw new BadRequestException(`Only draft payment requests can accept attachments`);
    }

    return payment;
  }
}
