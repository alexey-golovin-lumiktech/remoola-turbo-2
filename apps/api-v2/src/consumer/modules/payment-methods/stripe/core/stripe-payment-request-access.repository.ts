import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { StripePaymentRequestLedgerBootstrapRepository } from './stripe-payment-request-ledger-bootstrap.repository';
import { PrismaService } from '../../../../../shared/prisma.service';

type PaymentRequestSettlementTransitionClient =
  | Pick<Prisma.TransactionClient, `paymentRequestModel`>
  | Pick<PrismaService, `paymentRequestModel`>;

@Injectable()
export class StripePaymentRequestAccessRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerBootstrapRepository: StripePaymentRequestLedgerBootstrapRepository,
  ) {}

  async ensureCardPaymentRail(
    client: PaymentRequestSettlementTransitionClient,
    paymentRequestId: string,
    updatedBy: string,
  ) {
    await client.paymentRequestModel.updateMany({
      where: { id: paymentRequestId, paymentRail: null },
      data: {
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy,
      },
    });
  }

  async ensureCardPaymentRailForRequest(paymentRequestId: string, updatedBy: string) {
    await this.ensureCardPaymentRail(this.prisma, paymentRequestId, updatedBy);
  }

  async markPaymentRequestCompletedForStripe(
    client: PaymentRequestSettlementTransitionClient,
    paymentRequestId: string,
  ) {
    await client.paymentRequestModel.updateMany({
      where: {
        id: paymentRequestId,
        OR: [{ status: { not: $Enums.TransactionStatus.COMPLETED } }, { paymentRail: null }],
      },
      data: {
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy: `stripe`,
      },
    });
  }

  async markPaymentRequestCompletedForStripeRequest(paymentRequestId: string) {
    await this.markPaymentRequestCompletedForStripe(this.prisma, paymentRequestId);
  }

  async getPaymentRequestForPayer(consumerId: string, paymentRequestId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    if (!consumer?.email) {
      throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_CONSUMER);
    }

    const consumerEmail = consumer.email.trim().toLowerCase();

    await this.prisma.$transaction(async (tx) => {
      const paymentRequest = await tx.paymentRequestModel.findUnique({
        where: { id: paymentRequestId },
        include: { ledgerEntries: true },
      });

      if (!paymentRequest) {
        throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_REQUEST);
      }

      const canAccessAsPayer =
        paymentRequest.payerId === consumerId ||
        (!paymentRequest.payerId &&
          !!paymentRequest.payerEmail &&
          paymentRequest.payerEmail.trim().toLowerCase() === consumerEmail);

      if (!canAccessAsPayer) {
        throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_ACCESS);
      }

      if (paymentRequest.status !== $Enums.TransactionStatus.PENDING) {
        throw new ForbiddenException(errorCodes.PAYMENT_ALREADY_PROCESSED_CONFIRM);
      }

      if (!paymentRequest.payerId && paymentRequest.ledgerEntries.length > 0) {
        throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_STRIPE);
      }

      if (!paymentRequest.payerId) {
        const claim = await tx.paymentRequestModel.updateMany({
          where: {
            id: paymentRequestId,
            payerId: null,
            payerEmail: { equals: consumerEmail, mode: `insensitive` },
          },
          data: {
            payerId: consumerId,
            updatedBy: consumerId,
          },
        });

        if (claim.count === 0) {
          throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_CLAIM);
        }

        if (paymentRequest.ledgerEntries.length === 0) {
          if (!paymentRequest.requesterId) {
            throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_STRIPE);
          }
          await this.ledgerBootstrapRepository.bootstrapInitialLedgerEntries({
            tx,
            paymentRequest: {
              id: paymentRequest.id,
              requesterId: paymentRequest.requesterId,
              amount: paymentRequest.amount,
              currencyCode: paymentRequest.currencyCode,
            },
            consumerId,
          });
        }
      }
    });

    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: {
        ledgerEntries: true,
        requester: true,
      },
    });

    if (!paymentRequest || paymentRequest.payerId !== consumerId) {
      throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_CONFIRM);
    }

    if (paymentRequest.status !== $Enums.TransactionStatus.PENDING) {
      throw new ForbiddenException(errorCodes.PAYMENT_ALREADY_PROCESSED_PAY);
    }

    return paymentRequest;
  }
}
