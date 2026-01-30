import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerExchangeService } from '../../../consumer/modules/exchange/consumer-exchange.service';
import { UpdateAutoConversionRuleBody } from '../../../consumer/modules/exchange/dto/update-auto-conversion-rule.dto';
import { type ExchangeRateCreate, type ExchangeRateUpdate } from '../../../dtos/admin/exchange-rate.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class AdminExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeService: ConsumerExchangeService,
  ) {}

  async listRates(filters?: {
    from?: $Enums.CurrencyCode;
    to?: $Enums.CurrencyCode;
    status?: $Enums.ExchangeRateStatus;
    includeHistory?: string;
    includeExpired?: string;
  }) {
    const now = new Date();
    const includeHistory = filters?.includeHistory === `true`;
    const includeExpired = filters?.includeExpired === `true`;
    const rates = await this.prisma.exchangeRateModel.findMany({
      where: {
        deletedAt: null,
        ...(filters?.from && { fromCurrency: filters.from }),
        ...(filters?.to && { toCurrency: filters.to }),
        ...(filters?.status && { status: filters.status }),
        ...(includeHistory
          ? {
              ...(includeExpired
                ? {}
                : {
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                  }),
            }
          : {
              effectiveAt: { lte: now },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            }),
      },
      orderBy: [{ fromCurrency: `asc` }, { toCurrency: `asc` }, { effectiveAt: `desc` }],
    });

    return rates.map((rate) => this.normalizeRate(rate));
  }

  async getRateById(rateId: string) {
    const rate = await this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });

    if (!rate) {
      throw new NotFoundException(`Exchange rate not found`);
    }

    return this.normalizeRate(rate);
  }

  async createRate(body: ExchangeRateCreate, adminId?: string) {
    if (body.fromCurrency === body.toCurrency) {
      throw new BadRequestException(`Source and target currencies must differ`);
    }

    if (!Number.isFinite(body.rate) || body.rate <= 0) {
      throw new BadRequestException(`Invalid exchange rate`);
    }

    if (body.rateBid != null && body.rateAsk != null && body.rateBid > body.rateAsk) {
      throw new BadRequestException(`Bid rate cannot exceed ask rate`);
    }

    if (body.confidence != null && (body.confidence < 0 || body.confidence > 100)) {
      throw new BadRequestException(`Confidence must be between 0 and 100`);
    }

    const requestedEffectiveAt = body.effectiveAt ? new Date(body.effectiveAt) : new Date();
    if (Number.isNaN(requestedEffectiveAt.getTime())) {
      throw new BadRequestException(`Invalid effectiveAt`);
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.expiresAt && Number.isNaN(expiresAt?.getTime() ?? NaN)) {
      throw new BadRequestException(`Invalid expiresAt`);
    }

    const effectiveAt = await this.ensureUniqueEffectiveAt(body.fromCurrency, body.toCurrency, requestedEffectiveAt);

    if (expiresAt && expiresAt <= effectiveAt) {
      throw new BadRequestException(`expiresAt must be after effectiveAt`);
    }

    const status = body.status ?? $Enums.ExchangeRateStatus.DRAFT;
    const approvedAt = status === $Enums.ExchangeRateStatus.APPROVED ? new Date() : null;
    const approvedBy = status === $Enums.ExchangeRateStatus.APPROVED ? (adminId ?? null) : null;
    const fetchedAt = body.fetchedAt ? new Date(body.fetchedAt) : body.provider ? new Date() : null;

    const rate = await this.prisma.$transaction(async (tx) => {
      if (status === $Enums.ExchangeRateStatus.APPROVED) {
        await tx.exchangeRateModel.updateMany({
          where: {
            fromCurrency: body.fromCurrency,
            toCurrency: body.toCurrency,
            status: $Enums.ExchangeRateStatus.APPROVED,
            deletedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: effectiveAt } }],
          },
          data: {
            expiresAt: effectiveAt,
            updatedAt: new Date(),
            updatedBy: adminId ?? null,
          },
        });
      }

      return tx.exchangeRateModel.create({
        data: {
          fromCurrency: body.fromCurrency,
          toCurrency: body.toCurrency,
          rate: body.rate,
          rateBid: body.rateBid ?? null,
          rateAsk: body.rateAsk ?? null,
          spreadBps: body.spreadBps ?? null,
          status,
          effectiveAt,
          expiresAt,
          fetchedAt,
          provider: body.provider ?? null,
          providerRateId: body.providerRateId ?? null,
          confidence: body.confidence ?? null,
          createdBy: adminId ?? null,
          updatedBy: adminId ?? null,
          approvedBy,
          approvedAt,
        },
      });
    });

    return this.normalizeRate(rate);
  }

  async updateRate(rateId: string, body: ExchangeRateUpdate, adminId?: string) {
    const existing = await this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Exchange rate not found`);
    }

    const from = body.fromCurrency ?? existing.fromCurrency;
    const to = body.toCurrency ?? existing.toCurrency;

    if (from === to) {
      throw new BadRequestException(`Source and target currencies must differ`);
    }

    if (body.rate != null && (!Number.isFinite(body.rate) || body.rate <= 0)) {
      throw new BadRequestException(`Invalid exchange rate`);
    }

    if (body.rateBid != null && body.rateAsk != null && body.rateBid > body.rateAsk) {
      throw new BadRequestException(`Bid rate cannot exceed ask rate`);
    }

    if (body.confidence != null && (body.confidence < 0 || body.confidence > 100)) {
      throw new BadRequestException(`Confidence must be between 0 and 100`);
    }

    const shouldCreateNewVersion = existing.status === $Enums.ExchangeRateStatus.APPROVED;
    const requestedEffectiveAt = body.effectiveAt
      ? new Date(body.effectiveAt)
      : shouldCreateNewVersion
        ? new Date()
        : (existing.effectiveAt ?? new Date());
    if (body.effectiveAt && Number.isNaN(requestedEffectiveAt.getTime())) {
      throw new BadRequestException(`Invalid effectiveAt`);
    }

    const expiresAt = body.expiresAt === null ? null : body.expiresAt ? new Date(body.expiresAt) : existing.expiresAt;
    if (body.expiresAt && Number.isNaN(expiresAt?.getTime() ?? NaN)) {
      throw new BadRequestException(`Invalid expiresAt`);
    }

    if (expiresAt && requestedEffectiveAt && expiresAt <= requestedEffectiveAt) {
      throw new BadRequestException(`expiresAt must be after effectiveAt`);
    }

    const status = body.status ?? existing.status;
    const approvedAt = status === $Enums.ExchangeRateStatus.APPROVED ? new Date() : null;
    const approvedBy = status === $Enums.ExchangeRateStatus.APPROVED ? (adminId ?? null) : null;
    const fetchedAt = body.fetchedAt ? new Date(body.fetchedAt) : existing.fetchedAt;

    if (!shouldCreateNewVersion) {
      if (body.effectiveAt) {
        const conflict = await this.prisma.exchangeRateModel.findFirst({
          where: {
            fromCurrency: from,
            toCurrency: to,
            deletedAt: null,
            effectiveAt: requestedEffectiveAt,
            NOT: { id: existing.id },
          },
        });
        if (conflict) {
          throw new BadRequestException(`effectiveAt must be unique for this currency pair`);
        }
      }
      const updated = await this.prisma.exchangeRateModel.update({
        where: { id: existing.id },
        data: {
          fromCurrency: from,
          toCurrency: to,
          rate: body.rate ?? existing.rate,
          rateBid: body.rateBid ?? existing.rateBid,
          rateAsk: body.rateAsk ?? existing.rateAsk,
          spreadBps: body.spreadBps ?? existing.spreadBps,
          status,
          effectiveAt: body.effectiveAt ? requestedEffectiveAt : existing.effectiveAt,
          expiresAt,
          fetchedAt,
          provider: body.provider ?? existing.provider,
          providerRateId: body.providerRateId ?? existing.providerRateId,
          confidence: body.confidence ?? existing.confidence,
          updatedBy: adminId ?? null,
          approvedBy,
          approvedAt,
        },
      });

      return this.normalizeRate(updated);
    }

    const effectiveAt = await this.ensureUniqueEffectiveAt(from, to, requestedEffectiveAt, existing.id);
    if (expiresAt && effectiveAt && expiresAt <= effectiveAt) {
      throw new BadRequestException(`expiresAt must be after effectiveAt`);
    }

    const rate = await this.prisma.$transaction(async (tx) => {
      await tx.exchangeRateModel.update({
        where: { id: existing.id },
        data: {
          expiresAt: effectiveAt,
          updatedBy: adminId ?? null,
        },
      });

      return tx.exchangeRateModel.create({
        data: {
          fromCurrency: from,
          toCurrency: to,
          rate: body.rate ?? Number(existing.rate),
          rateBid: body.rateBid ?? existing.rateBid,
          rateAsk: body.rateAsk ?? existing.rateAsk,
          spreadBps: body.spreadBps ?? existing.spreadBps,
          status,
          effectiveAt,
          expiresAt,
          fetchedAt,
          provider: body.provider ?? existing.provider,
          providerRateId: body.providerRateId ?? existing.providerRateId,
          confidence: body.confidence ?? existing.confidence,
          createdBy: adminId ?? null,
          updatedBy: adminId ?? null,
          approvedBy,
          approvedAt,
        },
      });
    });

    return this.normalizeRate(rate);
  }

  async deleteRate(rateId: string, adminId?: string) {
    const existing = await this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Exchange rate not found`);
    }

    await this.prisma.exchangeRateModel.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), status: $Enums.ExchangeRateStatus.DISABLED, updatedBy: adminId ?? null },
    });

    return { rateId: existing.id };
  }

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
      body.minIntervalMinutes != null || body.enabled === true ? new Date() : (rule.nextRunAt ?? new Date());
    const maxConvertAmount = body.maxConvertAmount === null ? null : (body.maxConvertAmount ?? undefined);

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

  listCurrencies() {
    return Object.values($Enums.CurrencyCode);
  }

  private normalizeRate(rate: { rate: any; rateBid?: any; rateAsk?: any }) {
    return {
      ...rate,
      rate: Number(rate.rate),
      rateBid: rate.rateBid != null ? Number(rate.rateBid) : null,
      rateAsk: rate.rateAsk != null ? Number(rate.rateAsk) : null,
    };
  }

  private async ensureUniqueEffectiveAt(
    fromCurrency: $Enums.CurrencyCode,
    toCurrency: $Enums.CurrencyCode,
    effectiveAt: Date,
    excludeId?: string,
  ) {
    if (Number.isNaN(effectiveAt.getTime())) return effectiveAt;
    const latest = await this.prisma.exchangeRateModel.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }],
    });
    if (latest?.effectiveAt && latest.effectiveAt >= effectiveAt) {
      return new Date(latest.effectiveAt.getTime() + 1000);
    }
    return effectiveAt;
  }
}
