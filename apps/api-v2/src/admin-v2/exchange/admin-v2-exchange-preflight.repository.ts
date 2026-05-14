import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2ExchangePreflightRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveRateById(rateId: string) {
    return this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });
  }

  findActiveRuleById(ruleId: string) {
    return this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, deletedAt: null },
    });
  }

  findActiveScheduledConversionById(conversionId: string) {
    return this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, deletedAt: null },
    });
  }
}
