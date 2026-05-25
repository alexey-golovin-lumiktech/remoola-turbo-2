import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';

@Injectable()
export class StripePaymentRequestLedgerBootstrapRepository {
  async bootstrapInitialLedgerEntries(params: {
    tx: Pick<Prisma.TransactionClient, `ledgerEntryModel`>;
    paymentRequest: {
      id: string;
      requesterId: string;
      amount: Prisma.Decimal | number | string;
      currencyCode: $Enums.CurrencyCode;
    };
    consumerId: string;
  }) {
    const amount = Number(params.paymentRequest.amount);
    const ledgerId = newUuid();
    const payerKey = `pr:${params.paymentRequest.id}:payer`;
    const requesterKey = `pr:${params.paymentRequest.id}:requester`;

    try {
      await params.tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId: params.consumerId,
          paymentRequestId: params.paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: params.paymentRequest.currencyCode,
          status: $Enums.TransactionStatus.PENDING,
          amount: -amount,
          createdBy: params.consumerId,
          updatedBy: params.consumerId,
          idempotencyKey: payerKey,
          metadata: {
            rail: $Enums.PaymentRail.CARD,
            counterpartyId: params.paymentRequest.requesterId,
          },
        },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== `P2002`) {
        throw err;
      }
    }

    try {
      await params.tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId: params.paymentRequest.requesterId,
          paymentRequestId: params.paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          currencyCode: params.paymentRequest.currencyCode,
          status: $Enums.TransactionStatus.PENDING,
          amount,
          createdBy: params.consumerId,
          updatedBy: params.consumerId,
          idempotencyKey: requesterKey,
          metadata: {
            rail: $Enums.PaymentRail.CARD,
            counterpartyId: params.consumerId,
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
