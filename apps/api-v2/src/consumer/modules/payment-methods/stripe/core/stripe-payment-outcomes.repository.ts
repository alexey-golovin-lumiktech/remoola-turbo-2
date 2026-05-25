import { Injectable, type Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { StripePaymentRequestAccessRepository } from './stripe-payment-request-access.repository';
import { PrismaService } from '../../../../../shared/prisma.service';

@Injectable()
export class StripePaymentOutcomesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRequestAccessRepository: StripePaymentRequestAccessRepository,
  ) {}

  async appendCheckoutWaitingOutcomes(params: { paymentRequestId: string; checkoutSessionId: string; logger: Logger }) {
    const entries = await this.prisma.ledgerEntryModel.findMany({
      where: { paymentRequestId: params.paymentRequestId },
      select: { id: true },
    });
    for (const entry of entries) {
      await createOutcomeIdempotent(
        this.prisma,
        {
          ledgerEntryId: entry.id,
          status: $Enums.TransactionStatus.WAITING,
          source: `stripe`,
          externalId: params.checkoutSessionId,
        },
        params.logger,
      );
    }
  }

  async markSavedMethodPaymentCompleted(params: { paymentRequestId: string; paymentIntentId: string; logger: Logger }) {
    await this.prisma.$transaction(async (tx) => {
      const ledgerEntries = await tx.ledgerEntryModel.findMany({
        where: {
          paymentRequestId: params.paymentRequestId,
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
      for (const entry of ledgerEntries) {
        if (this.getEffectiveStatus(entry) === $Enums.TransactionStatus.COMPLETED) continue;
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: $Enums.TransactionStatus.COMPLETED,
            source: `stripe`,
            externalId: params.paymentIntentId,
          },
          params.logger,
        );
      }

      await this.paymentRequestAccessRepository.markPaymentRequestCompletedForStripe(tx, params.paymentRequestId);
    });
  }

  async appendDeniedSavedMethodPaymentOutcomes(params: { paymentRequestId: string; logger: Logger }) {
    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: { paymentRequestId: params.paymentRequestId },
        select: { id: true },
      });
      for (const entry of entries) {
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: $Enums.TransactionStatus.DENIED,
            source: `stripe`,
            externalId: `denied:stripe:pr:${params.paymentRequestId}:entry:${entry.id}`,
          },
          params.logger,
        );
      }
    });
  }

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }
}
