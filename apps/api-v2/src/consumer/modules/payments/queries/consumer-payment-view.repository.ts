import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerEmailResolver } from './consumer-email.resolver';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  consumerPaymentViewInclude,
  isEmailOnlyParticipant,
  mapToConsumerPaymentView,
} from '../mappers/consumer-payment-view.mapper';

@Injectable()
export class ConsumerPaymentViewRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailResolver: ConsumerEmailResolver,
  ) {}

  async getPaymentView(consumerId: string, paymentRequestId: string, backendBaseUrl?: string) {
    const consumerEmail = await this.emailResolver.resolve(consumerId);
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: consumerPaymentViewInclude,
    });

    if (!paymentRequest) {
      throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_GET);
    }

    const isEmailOnlyPayer = isEmailOnlyParticipant(paymentRequest.payerId, paymentRequest.payerEmail, consumerEmail);
    const isEmailOnlyRequester = isEmailOnlyParticipant(
      paymentRequest.requesterId,
      paymentRequest.requesterEmail,
      consumerEmail,
    );

    if (
      paymentRequest.payerId !== consumerId &&
      paymentRequest.requesterId !== consumerId &&
      !isEmailOnlyPayer &&
      !isEmailOnlyRequester
    ) {
      throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_GET);
    }

    return mapToConsumerPaymentView(paymentRequest, consumerId, consumerEmail, backendBaseUrl);
  }
}
