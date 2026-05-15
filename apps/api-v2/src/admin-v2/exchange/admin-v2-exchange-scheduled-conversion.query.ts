import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ExchangeScheduledConversionQuery {
  constructor(private readonly prisma: PrismaService) {}

  listScheduledConversions(params: { where: Prisma.ScheduledFxConversionModelWhereInput; skip: number; take: number }) {
    return Promise.all([
      this.prisma.scheduledFxConversionModel.count({ where: params.where }),
      this.prisma.scheduledFxConversionModel.findMany({
        where: params.where,
        include: {
          consumer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: [{ executeAt: `desc` }, { id: `desc` }],
        skip: params.skip,
        take: params.take,
      }),
    ]);
  }

  findScheduledConversionById(conversionId: string) {
    return this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, deletedAt: null },
      include: {
        consumer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  listLinkedLedgerEntries(ledgerId: string) {
    return this.prisma.ledgerEntryModel.findMany({
      where: { ledgerId, deletedAt: null },
      orderBy: [{ createdAt: `asc` }, { id: `asc` }],
      include: {
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
        },
      },
    });
  }

  async loadLedgerEntryMap(ledgerIds: string[]) {
    if (ledgerIds.length === 0) {
      return new Map<
        string,
        { id: string; type: $Enums.LedgerEntryType; amount: string; currencyCode: $Enums.CurrencyCode }
      >();
    }

    const entries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        ledgerId: { in: ledgerIds },
        deletedAt: null,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        amount: { gt: 0 },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: {
        id: true,
        ledgerId: true,
        type: true,
        amount: true,
        currencyCode: true,
      },
    });

    const map = new Map<
      string,
      { id: string; type: $Enums.LedgerEntryType; amount: string; currencyCode: $Enums.CurrencyCode }
    >();
    for (const entry of entries) {
      if (!map.has(entry.ledgerId)) {
        map.set(entry.ledgerId, {
          id: entry.id,
          type: entry.type,
          amount: entry.amount.toString(),
          currencyCode: entry.currencyCode,
        });
      }
    }
    return map;
  }
}
