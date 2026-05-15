import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { resolvePaymentLinkConsumerAppScopeFromLedgerHistory } from '../../shared/payment-link-scope-resolver';
import { PrismaService } from '../../shared/prisma.service';

const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;

const paymentRequestSettlementSelect = Prisma.validator<Prisma.PaymentRequestModelSelect>()({
  id: true,
  amount: true,
  currencyCode: true,
  status: true,
  payerId: true,
  requesterId: true,
  requesterEmail: true,
  ledgerEntries: {
    where: { type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] } },
    select: {
      ledgerId: true,
      type: true,
      status: true,
      createdAt: true,
      outcomes: {
        orderBy: { createdAt: `desc` },
        take: 1,
        select: { status: true },
      },
    },
  },
});

const requesterSettlementSelect = Prisma.validator<Prisma.LedgerEntryModelSelect>()({
  type: true,
  ledgerId: true,
  paymentRequest: {
    select: {
      paymentRail: true,
    },
  },
});

export type PaymentReversalPaymentRequest = Prisma.PaymentRequestModelGetPayload<{
  select: typeof paymentRequestSettlementSelect;
}>;

export type PaymentReversalRequesterSettlementEntry = Prisma.LedgerEntryModelGetPayload<{
  select: typeof requesterSettlementSelect;
}>;

type PaymentReversalNotificationContext = {
  consumerAppScope: ConsumerAppScope | undefined;
  payerEmail: string | null;
  requesterEmailResolved: string;
};

@Injectable()
export class AdminV2PaymentReversalQuery {
  constructor(private readonly prisma: PrismaService) {}

  getPaymentRequestForReversal(paymentRequestId: string) {
    return this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      select: paymentRequestSettlementSelect,
    });
  }

  async resolveStripePaymentIntentId(paymentRequestId: string): Promise<string | null> {
    const stripePayment = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        paymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        stripeId: { not: null },
      },
      select: { stripeId: true },
      orderBy: { createdAt: `desc` },
    });
    if (stripePayment?.stripeId) {
      return stripePayment.stripeId;
    }

    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: {
        status: $Enums.TransactionStatus.COMPLETED,
        source: `stripe`,
        externalId: { not: null },
        ledgerEntry: {
          paymentRequestId,
          type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
        },
      },
      orderBy: { createdAt: `desc` },
      select: { externalId: true },
    });
    return byOutcome?.externalId ?? null;
  }

  getRequesterSettlementEntry(paymentRequestId: string, requesterId: string) {
    return this.prisma.ledgerEntryModel.findFirst({
      where: {
        paymentRequestId,
        consumerId: requesterId,
        amount: { gt: 0 },
        type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
      },
      select: requesterSettlementSelect,
      orderBy: { createdAt: `desc` },
    });
  }

  async getNotificationContext(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string | null;
  }): Promise<PaymentReversalNotificationContext> {
    const { paymentRequestId, payerId, requesterId, requesterEmail } = params;
    const consumerIds = [payerId, ...(requesterId ? [requesterId] : [])];
    const [consumerAppScope, consumers] = await Promise.all([
      resolvePaymentLinkConsumerAppScopeFromLedgerHistory(this.prisma, paymentRequestId),
      this.prisma.consumerModel.findMany({
        where: { id: { in: consumerIds } },
        select: { id: true, email: true },
      }),
    ]);

    const payer = consumers.find((consumer) => consumer.id === payerId);
    const requester = requesterId ? consumers.find((consumer) => consumer.id === requesterId) : null;

    return {
      consumerAppScope,
      payerEmail: payer?.email ?? null,
      requesterEmailResolved: requester?.email ?? requesterEmail ?? ``,
    };
  }
}
