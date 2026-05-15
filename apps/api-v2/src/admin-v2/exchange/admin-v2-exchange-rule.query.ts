import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ExchangeRuleQuery {
  constructor(private readonly prisma: PrismaService) {}

  listRules(params: { where: Prisma.WalletAutoConversionRuleModelWhereInput; skip: number; take: number }) {
    return Promise.all([
      this.prisma.walletAutoConversionRuleModel.count({ where: params.where }),
      this.prisma.walletAutoConversionRuleModel.findMany({
        where: params.where,
        include: {
          consumer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
        skip: params.skip,
        take: params.take,
      }),
    ]);
  }

  findRuleById(ruleId: string) {
    return this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, deletedAt: null },
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
}
