import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

const reversalPaymentRequestSelect = {
  id: true,
  amount: true,
  currencyCode: true,
  payerId: true,
  requesterId: true,
  requesterEmail: true,
} as const;

@Injectable()
export class StripeWebhookReversalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolveDisputeLedgerEntryIdByPaymentIntent(paymentIntentId: string) {
    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { id: true },
      orderBy: { createdAt: `desc` },
    });
    if (entry) {
      return entry.id;
    }

    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: { externalId: paymentIntentId },
      orderBy: { createdAt: `desc` },
      select: { ledgerEntryId: true },
    });

    return byOutcome?.ledgerEntryId ?? null;
  }

  async resolvePaymentRequestByPaymentIntent(paymentIntentId: string) {
    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: { externalId: paymentIntentId },
      orderBy: { createdAt: `desc` },
      select: {
        ledgerEntry: {
          select: {
            paymentRequest: {
              select: reversalPaymentRequestSelect,
            },
          },
        },
      },
    });
    if (byOutcome?.ledgerEntry?.paymentRequest) {
      return byOutcome.ledgerEntry.paymentRequest;
    }

    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: {
        paymentRequest: {
          select: reversalPaymentRequestSelect,
        },
      },
      orderBy: { createdAt: `desc` },
    });

    return entry?.paymentRequest ?? null;
  }
}
