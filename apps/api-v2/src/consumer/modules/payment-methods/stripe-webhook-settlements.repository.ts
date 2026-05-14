import { Injectable, type Logger } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

type FinalizeCheckoutSettlementParams = {
  checkoutSessionId: string;
  paymentRequestId: string;
  consumerId: string;
  paymentIntentId: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  customerId: string | null;
  logger: Logger;
};

@Injectable()
export class StripeWebhookSettlementsRepository {
  private static readonly PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
    $Enums.LedgerEntryType.USER_PAYMENT,
    $Enums.LedgerEntryType.USER_DEPOSIT,
  ] as const;

  constructor(private readonly prisma: PrismaService) {}

  async finalizeCheckoutSettlement(params: FinalizeCheckoutSettlementParams) {
    return this.prisma.$transaction(async (tx) => {
      const validation = await this.validateCheckoutSettlement(tx, params);
      if (!validation) {
        return false;
      }

      await tx.paymentRequestModel.updateMany({
        where: { id: params.paymentRequestId, paymentRail: null },
        data: {
          paymentRail: $Enums.PaymentRail.CARD,
          updatedBy: `stripe`,
        },
      });

      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          paymentRequestId: params.paymentRequestId,
          type: { in: [...StripeWebhookSettlementsRepository.PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
        },
        select: {
          id: true,
          status: true,
          outcomes: {
            orderBy: { createdAt: `desc` },
            take: 1,
            select: { status: true },
          },
        },
      });
      for (const entry of entries) {
        if (this.getEffectiveStatus(entry) === $Enums.TransactionStatus.COMPLETED) continue;
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: $Enums.TransactionStatus.COMPLETED,
            source: `stripe`,
            externalId: params.paymentIntentId ?? undefined,
          },
          params.logger,
        );
      }

      await tx.paymentRequestModel.updateMany({
        where: {
          id: params.paymentRequestId,
          OR: [{ status: { not: $Enums.TransactionStatus.COMPLETED } }, { paymentRail: null }],
        },
        data: {
          status: $Enums.TransactionStatus.COMPLETED,
          paymentRail: $Enums.PaymentRail.CARD,
          updatedBy: `stripe`,
        },
      });
      return true;
    });
  }

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private async validateCheckoutSettlement(
    db: Pick<Prisma.TransactionClient, `paymentRequestModel`>,
    params: FinalizeCheckoutSettlementParams,
  ): Promise<boolean> {
    if (params.paymentStatus !== `paid`) {
      params.logger.warn({
        message: `Skipping unpaid checkout settlement`,
        checkoutSessionId: params.checkoutSessionId,
      });
      return false;
    }

    const paymentRequest = await db.paymentRequestModel.findUnique({
      where: { id: params.paymentRequestId },
      select: {
        amount: true,
        currencyCode: true,
        payerId: true,
        payer: {
          select: {
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!paymentRequest || paymentRequest.payerId !== params.consumerId) {
      params.logger.warn({
        message: `Skipping checkout settlement with mismatched payment request`,
        checkoutSessionId: params.checkoutSessionId,
      });
      return false;
    }

    const expectedAmountMinor = Math.round(
      Number(paymentRequest.amount) * 10 ** getCurrencyFractionDigits(paymentRequest.currencyCode),
    );
    if (params.amountTotal !== expectedAmountMinor) {
      params.logger.warn({
        message: `Skipping checkout settlement with mismatched amount`,
        checkoutSessionId: params.checkoutSessionId,
      });
      return false;
    }

    if (params.currency?.toUpperCase() !== paymentRequest.currencyCode) {
      params.logger.warn({
        message: `Skipping checkout settlement with mismatched currency`,
        checkoutSessionId: params.checkoutSessionId,
      });
      return false;
    }

    const expectedCustomerId = paymentRequest.payer?.stripeCustomerId ?? null;
    if (expectedCustomerId && params.customerId && params.customerId !== expectedCustomerId) {
      params.logger.warn({
        message: `Skipping checkout settlement with mismatched customer`,
        checkoutSessionId: params.checkoutSessionId,
      });
      return false;
    }

    return true;
  }
}
