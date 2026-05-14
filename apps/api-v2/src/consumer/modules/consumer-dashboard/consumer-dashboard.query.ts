import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

export type DashboardActivityLedgerRow = {
  id: string;
  ledgerId: string;
  type: $Enums.LedgerEntryType;
  status: $Enums.TransactionStatus;
  amount: number | { toString(): string };
  currencyCode: $Enums.CurrencyCode;
  createdAt: Date;
  metadata: Prisma.JsonValue | null;
  paymentRequestId: string | null;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
};

@Injectable()
export class ConsumerDashboardQuery {
  constructor(private readonly prisma: PrismaService) {}

  private getDashboardCandidateWhere(consumerId: string) {
    return {
      OR: [
        { status: { not: $Enums.TransactionStatus.COMPLETED } },
        {
          ledgerEntries: {
            some: {
              consumerId,
              OR: [
                { status: { not: $Enums.TransactionStatus.COMPLETED } },
                { outcomes: { some: { status: { not: $Enums.TransactionStatus.COMPLETED } } } },
              ],
            },
          },
        },
      ],
    };
  }

  private getDashboardPayerWhere(
    consumerId: string,
    consumerEmail: string | null,
  ): Prisma.PaymentRequestModelWhereInput {
    return {
      OR: [
        { payerId: consumerId },
        ...(consumerEmail
          ? [{ payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` as const } }]
          : []),
      ],
    };
  }

  async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  async findFinancialActivityRows(consumerId: string) {
    return this.prisma.ledgerEntryModel.findMany({
      where: {
        consumerId,
        deletedAt: null,
        type: {
          in: [
            $Enums.LedgerEntryType.USER_PAYMENT,
            $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            $Enums.LedgerEntryType.USER_PAYOUT,
            $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL,
            $Enums.LedgerEntryType.USER_DEPOSIT,
            $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
            $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          ],
        },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: 100,
      include: {
        outcomes: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: { status: true },
        },
        paymentRequest: {
          select: { paymentRail: true },
        },
      },
    });
  }

  async findPaymentMethodLabels(consumerId: string, paymentMethodIds: string[]) {
    return this.prisma.paymentMethodModel.findMany({
      where: {
        id: { in: paymentMethodIds },
        consumerId,
      },
      select: {
        id: true,
        brand: true,
        last4: true,
      },
    });
  }

  async findSetupConsumer(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: {
        personalDetails: true,
        paymentMethods: true,
        consumerResources: {
          include: {
            resource: true,
          },
        },
      },
    });
  }

  async findActiveRequestCandidates(consumerId: string, consumerEmail: string | null) {
    return this.prisma.paymentRequestModel.findMany({
      where: {
        AND: [this.getDashboardPayerWhere(consumerId, consumerEmail), this.getDashboardCandidateWhere(consumerId)],
      },
      select: {
        status: true,
        ledgerEntries: {
          where: { consumerId },
          orderBy: { createdAt: `desc` },
          take: 1,
          select: {
            status: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });
  }

  async findLastPayment(consumerId: string) {
    return this.prisma.ledgerEntryModel.findFirst({
      where: { consumerId, deletedAt: null },
      orderBy: { createdAt: `desc` },
      select: { createdAt: true },
    });
  }

  async findSettings(consumerId: string) {
    return this.prisma.consumerSettingsModel.findUnique({
      where: { consumerId, deletedAt: null },
      select: { preferredCurrency: true },
    });
  }

  async findPendingPaymentRequests(consumerId: string, consumerEmail: string | null) {
    return this.prisma.paymentRequestModel.findMany({
      where: {
        AND: [this.getDashboardPayerWhere(consumerId, consumerEmail), this.getDashboardCandidateWhere(consumerId)],
      },
      orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }, { id: `desc` }],
      include: {
        requester: {
          select: { email: true },
        },
        ledgerEntries: {
          where: { consumerId },
          orderBy: { createdAt: `desc` },
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true, createdAt: true },
            },
          },
        },
      },
    });
  }

  async findVerificationConsumer(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
  }

  async findQuickDocs(consumerId: string) {
    return this.prisma.consumerResourceModel.findMany({
      where: { consumerId },
      include: {
        resource: true,
      },
      orderBy: {
        createdAt: `desc`,
      },
      take: 5,
    });
  }
}
