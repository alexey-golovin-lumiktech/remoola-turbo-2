import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerExchangeAutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  countAutoConversionRules(consumerId: string) {
    return this.prisma.walletAutoConversionRuleModel.count({
      where: { consumerId, deletedAt: null },
    });
  }

  listAutoConversionRules(consumerId: string, skip: number, take: number) {
    return this.prisma.walletAutoConversionRuleModel.findMany({
      where: { consumerId, deletedAt: null },
      orderBy: { createdAt: `desc` },
      skip,
      take,
    });
  }

  createAutoConversionRule(data: {
    consumerId: string;
    fromCurrency: $Enums.CurrencyCode;
    toCurrency: $Enums.CurrencyCode;
    targetBalance: number;
    maxConvertAmount: number | null;
    minIntervalMinutes: number;
    nextRunAt: Date;
    enabled: boolean;
  }) {
    return this.prisma.walletAutoConversionRuleModel.create({ data });
  }

  findActiveAutoConversionRule(consumerId: string, ruleId: string) {
    return this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, consumerId, deletedAt: null },
    });
  }

  findAutoConversionRuleById(ruleId: string) {
    return this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, deletedAt: null },
    });
  }

  findExecutableAutoConversionRule(ruleId: string, options?: { requireEnabled?: boolean }) {
    return this.prisma.walletAutoConversionRuleModel.findFirst({
      where: {
        id: ruleId,
        deletedAt: null,
        ...(options?.requireEnabled ? { enabled: true } : {}),
      },
    });
  }

  updateAutoConversionRule(
    ruleId: string,
    data: {
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      targetBalance?: number;
      maxConvertAmount?: number | null;
      minIntervalMinutes: number;
      enabled?: boolean;
      nextRunAt: Date;
    },
  ) {
    return this.prisma.walletAutoConversionRuleModel.update({
      where: { id: ruleId },
      data,
    });
  }

  softDeleteAutoConversionRule(ruleId: string, deletedAt: Date) {
    return this.prisma.walletAutoConversionRuleModel.update({
      where: { id: ruleId },
      data: { deletedAt, enabled: false },
    });
  }

  findDueAutoConversionRules(now: Date, take: number) {
    return this.prisma.walletAutoConversionRuleModel.findMany({
      where: {
        enabled: true,
        deletedAt: null,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      orderBy: { nextRunAt: `asc` },
      take,
    });
  }

  async claimDueAutoConversionRule(params: { ruleId: string; now: Date; minIntervalMinutes: number }) {
    const result = await this.prisma.walletAutoConversionRuleModel.updateMany({
      where: {
        id: params.ruleId,
        enabled: true,
        deletedAt: null,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: params.now } }],
      },
      data: {
        lastRunAt: params.now,
        nextRunAt: new Date(params.now.getTime() + params.minIntervalMinutes * 60 * 1000),
      },
    });

    return result.count > 0;
  }

  async claimAutoConversionRuleNow(params: {
    ruleId: string;
    now: Date;
    minIntervalMinutes: number;
    expectedNextRunAt: Date | null;
  }) {
    const result = await this.prisma.walletAutoConversionRuleModel.updateMany({
      where: {
        id: params.ruleId,
        deletedAt: null,
        ...(params.expectedNextRunAt ? { nextRunAt: params.expectedNextRunAt } : { nextRunAt: null }),
      },
      data: {
        lastRunAt: params.now,
        nextRunAt: new Date(params.now.getTime() + params.minIntervalMinutes * 60 * 1000),
      },
    });

    return result.count > 0;
  }

  updateAutoConversionRuleMetadata(ruleId: string, metadata: Prisma.InputJsonValue) {
    return this.prisma.walletAutoConversionRuleModel.update({
      where: { id: ruleId },
      data: { metadata },
    });
  }

  rescheduleAutoConversionRuleFailure(ruleId: string, nextRunAt: Date, metadata: Prisma.InputJsonValue) {
    return this.prisma.walletAutoConversionRuleModel.update({
      where: { id: ruleId },
      data: {
        nextRunAt,
        metadata,
      },
    });
  }

  countScheduledConversions(consumerId: string) {
    return this.prisma.scheduledFxConversionModel.count({
      where: { consumerId, deletedAt: null },
    });
  }

  listScheduledConversions(consumerId: string, skip: number, take: number) {
    return this.prisma.scheduledFxConversionModel.findMany({
      where: { consumerId, deletedAt: null },
      orderBy: { executeAt: `desc` },
      skip,
      take,
    });
  }

  createScheduledConversion(data: {
    consumerId: string;
    fromCurrency: $Enums.CurrencyCode;
    toCurrency: $Enums.CurrencyCode;
    amount: number;
    executeAt: Date;
  }) {
    return this.prisma.scheduledFxConversionModel.create({ data });
  }

  findActiveScheduledConversion(consumerId: string, conversionId: string) {
    return this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, consumerId, deletedAt: null },
    });
  }

  findScheduledConversionById(conversionId: string) {
    return this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, deletedAt: null },
    });
  }

  cancelScheduledConversion(conversionId: string, updatedAt: Date) {
    return this.prisma.scheduledFxConversionModel.update({
      where: { id: conversionId },
      data: {
        status: $Enums.ScheduledFxConversionStatus.CANCELLED,
        updatedAt,
      },
    });
  }

  findDueScheduledConversions(now: Date, take: number) {
    return this.prisma.scheduledFxConversionModel.findMany({
      where: {
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        executeAt: { lte: now },
        deletedAt: null,
      },
      orderBy: { executeAt: `asc` },
      take,
    });
  }

  async claimDueScheduledConversion(conversionId: string) {
    const result = await this.prisma.scheduledFxConversionModel.updateMany({
      where: {
        id: conversionId,
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        deletedAt: null,
      },
      data: {
        status: $Enums.ScheduledFxConversionStatus.PROCESSING,
        processingAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return result.count > 0;
  }

  async claimScheduledConversionNow(conversionId: string) {
    const result = await this.prisma.scheduledFxConversionModel.updateMany({
      where: {
        id: conversionId,
        status: {
          in: [$Enums.ScheduledFxConversionStatus.PENDING, $Enums.ScheduledFxConversionStatus.FAILED],
        },
      },
      data: {
        status: $Enums.ScheduledFxConversionStatus.PROCESSING,
        processingAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return result.count > 0;
  }

  markScheduledConversionExecuted(conversionId: string, ledgerId: string) {
    return this.prisma.scheduledFxConversionModel.update({
      where: { id: conversionId },
      data: {
        status: $Enums.ScheduledFxConversionStatus.EXECUTED,
        executedAt: new Date(),
        ledgerId,
        lastError: null,
      },
    });
  }

  markScheduledConversionFailed(conversionId: string, lastError: string) {
    return this.prisma.scheduledFxConversionModel.update({
      where: { id: conversionId },
      data: {
        status: $Enums.ScheduledFxConversionStatus.FAILED,
        failedAt: new Date(),
        lastError,
      },
    });
  }
}
