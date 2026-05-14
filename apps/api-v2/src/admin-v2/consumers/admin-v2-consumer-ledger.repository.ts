import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ConsumerLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getLedgerSummary(consumerId: string) {
    const rows = await this.prisma.ledgerEntryModel.groupBy({
      by: [`currencyCode`, `status`],
      where: {
        consumerId,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });

    const summary = rows.reduce<
      Record<string, { completedAmount: string; pendingAmount: string; completedCount: number; pendingCount: number }>
    >((acc, row) => {
      const key = row.currencyCode;
      const bucket = acc[key] ?? {
        completedAmount: `0`,
        pendingAmount: `0`,
        completedCount: 0,
        pendingCount: 0,
      };
      const amount = row._sum.amount?.toString() ?? `0`;
      if (row.status === $Enums.TransactionStatus.COMPLETED) {
        bucket.completedAmount = (Number(bucket.completedAmount) + Number(amount)).toFixed(2);
        bucket.completedCount += row._count._all;
      } else {
        bucket.pendingAmount = (Number(bucket.pendingAmount) + Number(amount)).toFixed(2);
        bucket.pendingCount += row._count._all;
      }
      acc[key] = bucket;
      return acc;
    }, {});

    return {
      consumerId,
      summary,
    };
  }
}
