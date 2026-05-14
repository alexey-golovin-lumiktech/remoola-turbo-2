import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2PayoutsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPayoutRows(where: Prisma.LedgerEntryModelWhereInput, take: number) {
    return this.prisma.ledgerEntryModel.findMany({
      where,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take,
      select: {
        id: true,
        ledgerId: true,
        type: true,
        currencyCode: true,
        status: true,
        amount: true,
        stripeId: true,
        metadata: true,
        consumerId: true,
        paymentRequestId: true,
        createdAt: true,
        updatedAt: true,
        consumer: {
          select: {
            email: true,
          },
        },
        payoutEscalation: {
          select: {
            id: true,
          },
        },
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
          select: {
            id: true,
            status: true,
            externalId: true,
            createdAt: true,
          },
        },
      },
    });
  }

  fetchPaymentMethodsByIds(paymentMethodIds: string[]) {
    return this.prisma.paymentMethodModel.findMany({
      where: {
        id: { in: paymentMethodIds },
      },
      select: {
        id: true,
        consumerId: true,
        type: true,
        brand: true,
        last4: true,
        bankLast4: true,
        deletedAt: true,
      },
    });
  }

  findPayoutCaseEntry(payoutId: string) {
    return this.prisma.ledgerEntryModel.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        ledgerId: true,
        type: true,
        currencyCode: true,
        status: true,
        amount: true,
        stripeId: true,
        metadata: true,
        consumerId: true,
        paymentRequestId: true,
        createdAt: true,
        updatedAt: true,
        consumer: {
          select: {
            email: true,
          },
        },
        payoutEscalation: {
          select: {
            id: true,
            reason: true,
            confirmed: true,
            createdAt: true,
            escalatedByAdmin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        paymentRequest: {
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            status: true,
            paymentRail: true,
            payerId: true,
            payerEmail: true,
            requesterId: true,
            requesterEmail: true,
            payer: { select: { email: true } },
            requester: { select: { email: true } },
          },
        },
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            id: true,
            status: true,
            source: true,
            externalId: true,
            createdAt: true,
          },
        },
      },
    });
  }

  findRelatedEntries(ledgerId: string) {
    return this.prisma.ledgerEntryModel.findMany({
      where: {
        ledgerId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: `asc` }, { id: `asc` }],
      select: {
        id: true,
        type: true,
        amount: true,
        currencyCode: true,
        status: true,
        createdAt: true,
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
          select: { status: true },
        },
      },
    });
  }

  findAuditContext(resourceIds: string[]) {
    return this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resourceId: { in: resourceIds },
      },
      include: {
        admin: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: 20,
    });
  }
}
