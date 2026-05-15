import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerExchangeRateQuery {
  constructor(private readonly prisma: PrismaService) {}

  findApprovedEffectiveRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode, now: Date) {
    return this.prisma.exchangeRateModel.findFirst({
      where: {
        fromCurrency: from,
        toCurrency: to,
        status: $Enums.ExchangeRateStatus.APPROVED,
        deletedAt: null,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }],
    });
  }
}
