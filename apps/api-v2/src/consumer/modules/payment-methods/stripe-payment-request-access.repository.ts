import { randomUUID } from 'crypto';

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { PrismaService } from '../../../shared/prisma.service';

type PaymentRequestSettlementTransitionClient =
  | Pick<Prisma.TransactionClient, `paymentRequestModel`>
  | Pick<PrismaService, `paymentRequestModel`>;

@Injectable()
export class StripePaymentRequestAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

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
          const amount = Number(paymentRequest.amount);
          const ledgerId = randomUUID();
          const payerKey = `pr:${paymentRequest.id}:payer`;
          const requesterKey = `pr:${paymentRequest.id}:requester`;

          try {
            await tx.ledgerEntryModel.create({
              data: {
                ledgerId,
                consumerId,
                paymentRequestId: paymentRequest.id,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                currencyCode: paymentRequest.currencyCode,
                status: $Enums.TransactionStatus.PENDING,
                amount: -amount,
                createdBy: consumerId,
                updatedBy: consumerId,
                idempotencyKey: payerKey,
                metadata: {
                  rail: $Enums.PaymentRail.CARD,
                  counterpartyId: paymentRequest.requesterId,
                },
              },
            });
          } catch (err) {
            if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== `P2002`) {
              throw err;
            }
          }

          try {
            await tx.ledgerEntryModel.create({
              data: {
                ledgerId,
                consumerId: paymentRequest.requesterId,
                paymentRequestId: paymentRequest.id,
                type: $Enums.LedgerEntryType.USER_DEPOSIT,
                currencyCode: paymentRequest.currencyCode,
                status: $Enums.TransactionStatus.PENDING,
                amount,
                createdBy: consumerId,
                updatedBy: consumerId,
                idempotencyKey: requesterKey,
                metadata: {
                  rail: $Enums.PaymentRail.CARD,
                  counterpartyId: consumerId,
                },
              },
            });
          } catch (err) {
            if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== `P2002`) {
              throw err;
            }
          }
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
