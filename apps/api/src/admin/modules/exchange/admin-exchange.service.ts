import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { UpdateAutoConversionRuleBody } from '../../../consumer/modules/exchange/dto/update-auto-conversion-rule.dto';
import { ConsumerExchangeService } from '../../../consumer/modules/exchange/consumer-exchange.service';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeService: ConsumerExchangeService,
  ) {}

  async listRules() {
    const rules = await this.prisma.walletAutoConversionRuleModel.findMany({
      where: { deletedAt: null },
      include: {
        consumer: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: `desc` },
    });

    return rules.map((rule) => ({
      ...rule,
      targetBalance: Number(rule.targetBalance),
      maxConvertAmount: rule.maxConvertAmount != null ? Number(rule.maxConvertAmount) : null,
    }));
  }

  async updateRule(ruleId: string, body: UpdateAutoConversionRuleBody) {
    const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!rule) {
      throw new NotFoundException(`Rule not found`);
    }

    const from = body.from ?? rule.fromCurrency;
    const to = body.to ?? rule.toCurrency;

    if (from === to) {
      throw new BadRequestException(`Source and target currencies must differ`);
    }

    if (body.targetBalance != null && (!Number.isFinite(body.targetBalance) || body.targetBalance < 0)) {
      throw new BadRequestException(`Invalid target balance`);
    }

    if (body.maxConvertAmount != null && body.maxConvertAmount <= 0) {
      throw new BadRequestException(`Invalid max convert amount`);
    }

    const minIntervalMinutes = body.minIntervalMinutes ?? rule.minIntervalMinutes;
    const nextRunAt =
      body.minIntervalMinutes != null || body.enabled === true ? new Date() : rule.nextRunAt ?? new Date();
    const maxConvertAmount = body.maxConvertAmount === null ? null : body.maxConvertAmount ?? undefined;

    const updated = await this.prisma.walletAutoConversionRuleModel.update({
      where: { id: rule.id },
      data: {
        fromCurrency: from,
        toCurrency: to,
        targetBalance: body.targetBalance ?? undefined,
        maxConvertAmount,
        minIntervalMinutes,
        enabled: body.enabled ?? undefined,
        nextRunAt,
      },
    });

    return {
      ...updated,
      targetBalance: Number(updated.targetBalance),
      maxConvertAmount: updated.maxConvertAmount != null ? Number(updated.maxConvertAmount) : null,
    };
  }

  async runRuleNow(ruleId: string, adminId?: string) {
    return this.exchangeService.runAutoConversionRuleNow(ruleId, {
      source: `admin_rule_run`,
      actorId: adminId,
    });
  }

  async listScheduledConversions() {
    const conversions = await this.prisma.scheduledFxConversionModel.findMany({
      where: { deletedAt: null },
      include: {
        consumer: { select: { id: true, email: true } },
      },
      orderBy: { executeAt: `desc` },
    });

    return conversions.map((conversion) => ({
      ...conversion,
      amount: Number(conversion.amount),
    }));
  }

  async cancelScheduledConversion(conversionId: string) {
    const conversion = await this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, deletedAt: null },
    });

    if (!conversion) {
      throw new NotFoundException(`Scheduled conversion not found`);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.EXECUTED) {
      throw new BadRequestException(`Conversion already executed`);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.CANCELLED) {
      throw new BadRequestException(`Conversion already cancelled`);
    }

    const updated = await this.prisma.scheduledFxConversionModel.update({
      where: { id: conversion.id },
      data: {
        status: $Enums.ScheduledFxConversionStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    return {
      conversionId: updated.id,
      status: updated.status,
    };
  }

  async executeScheduledConversion(conversionId: string, adminId?: string) {
    return this.exchangeService.executeScheduledConversionNow(conversionId, {
      source: `admin`,
      actorId: adminId,
    });
  }
}
