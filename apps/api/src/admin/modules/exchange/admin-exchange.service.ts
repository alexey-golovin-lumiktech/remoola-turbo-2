import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

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
    page?: number;
    pageSize?: number;
    from?: $Enums.CurrencyCode;
    to?: $Enums.CurrencyCode;
    status?: $Enums.ExchangeRateStatus;
    includeHistory?: string;
    includeExpired?: string;
    includeDeleted?: boolean;
  }) {
    const now = new Date();
    const includeHistory = filters?.includeHistory === `true`;
    const includeExpired = filters?.includeExpired === `true`;
    const pageSize = Math.min(Math.max(filters?.pageSize ?? 10, 1), 500);
    const page = Math.max(filters?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExchangeRateModelWhereInput = {
      ...(filters?.includeDeleted !== true && { deletedAt: null }),
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
    };

    const [rates, total] = await Promise.all([
      this.prisma.exchangeRateModel.findMany({
        where,
        orderBy: [{ fromCurrency: `asc` }, { toCurrency: `asc` }, { effectiveAt: `desc` }],
        skip,
        take: pageSize,
      }),
      this.prisma.exchangeRateModel.count({ where }),
    ]);

    return {
      items: rates.map((rate) => this.normalizeRate(rate)),
      total,
      page,
      pageSize,
    };
  }

  async getRateById(rateId: string) {
    const rate = await this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });

    if (!rate) {
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }

    return this.normalizeRate(rate);
  }

  async createRate(body: ExchangeRateCreate, adminId?: string) {
    if (body.fromCurrency === body.toCurrency) {
      throw new BadRequestException(adminErrorCodes.ADMIN_SOURCE_AND_TARGET_CURRENCIES_MUST_DIFFER);
    }

    if (!Number.isFinite(body.rate) || body.rate <= 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_EXCHANGE_RATE);
    }

    if (body.rateBid != null && body.rateAsk != null && body.rateBid > body.rateAsk) {
      throw new BadRequestException(adminErrorCodes.ADMIN_BID_RATE_CANNOT_EXCEED_ASK_RATE);
    }

    if (body.confidence != null && (body.confidence < 0 || body.confidence > 100)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_CONFIDENCE_MUST_BE_0_100);
    }

    const requestedEffectiveAt = body.effectiveAt ? new Date(body.effectiveAt) : new Date();
    if (Number.isNaN(requestedEffectiveAt.getTime())) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_EFFECTIVE_AT);
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.expiresAt && Number.isNaN(expiresAt?.getTime() ?? NaN)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_EXPIRES_AT);
    }

    const effectiveAt = await this.ensureUniqueEffectiveAt(body.fromCurrency, body.toCurrency, requestedEffectiveAt);

    if (expiresAt && expiresAt <= effectiveAt) {
      throw new BadRequestException(adminErrorCodes.ADMIN_EXPIRES_AT_MUST_BE_AFTER_EFFECTIVE_AT);
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
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }

    const from = body.fromCurrency ?? existing.fromCurrency;
    const to = body.toCurrency ?? existing.toCurrency;

    if (from === to) {
      throw new BadRequestException(adminErrorCodes.ADMIN_SOURCE_AND_TARGET_CURRENCIES_MUST_DIFFER);
    }

    if (body.rate != null && (!Number.isFinite(body.rate) || body.rate <= 0)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_EXCHANGE_RATE);
    }

    if (body.rateBid != null && body.rateAsk != null && body.rateBid > body.rateAsk) {
      throw new BadRequestException(adminErrorCodes.ADMIN_BID_RATE_CANNOT_EXCEED_ASK_RATE);
    }

    if (body.confidence != null && (body.confidence < 0 || body.confidence > 100)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_CONFIDENCE_MUST_BE_0_100);
    }

    const shouldCreateNewVersion = existing.status === $Enums.ExchangeRateStatus.APPROVED;
    const requestedEffectiveAt = body.effectiveAt
      ? new Date(body.effectiveAt)
      : shouldCreateNewVersion
        ? new Date()
        : (existing.effectiveAt ?? new Date());
    if (body.effectiveAt && Number.isNaN(requestedEffectiveAt.getTime())) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_EFFECTIVE_AT);
    }

    const expiresAt = body.expiresAt === null ? null : body.expiresAt ? new Date(body.expiresAt) : existing.expiresAt;
    if (body.expiresAt && Number.isNaN(expiresAt?.getTime() ?? NaN)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_EXPIRES_AT);
    }

    if (expiresAt && requestedEffectiveAt && expiresAt <= requestedEffectiveAt) {
      throw new BadRequestException(adminErrorCodes.ADMIN_EXPIRES_AT_MUST_BE_AFTER_EFFECTIVE_AT);
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
          throw new BadRequestException(adminErrorCodes.ADMIN_EFFECTIVE_AT_MUST_BE_UNIQUE_FOR_PAIR);
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
      throw new BadRequestException(adminErrorCodes.ADMIN_EXPIRES_AT_MUST_BE_AFTER_EFFECTIVE_AT);
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
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }

    await this.prisma.exchangeRateModel.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), status: $Enums.ExchangeRateStatus.DISABLED, updatedBy: adminId ?? null },
    });

    return { rateId: existing.id };
  }

  private static readonly SEARCH_MAX_LEN = 200;

  async listRules(filters?: {
    q?: string;
    enabled?: string;
    page?: number;
    pageSize?: number;
    includeDeleted?: boolean;
  }) {
    const search =
      typeof filters?.q === `string` && filters.q.trim().length > 0
        ? filters.q.trim().slice(0, AdminExchangeService.SEARCH_MAX_LEN)
        : undefined;
    const enabledFilter = filters?.enabled === `true` ? true : filters?.enabled === `false` ? false : undefined;
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 10));

    const where: Prisma.WalletAutoConversionRuleModelWhereInput = {
      ...(filters?.includeDeleted !== true && { deletedAt: null }),
      ...(enabledFilter !== undefined && { enabled: enabledFilter }),
      ...(search && { consumer: { email: { contains: search, mode: `insensitive` } } }),
    };

    const [total, rules] = await Promise.all([
      this.prisma.walletAutoConversionRuleModel.count({ where }),
      this.prisma.walletAutoConversionRuleModel.findMany({
        where,
        include: {
          consumer: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: `desc` },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = rules.map((rule) => ({
      ...rule,
      targetBalance: Number(rule.targetBalance),
      maxConvertAmount: rule.maxConvertAmount != null ? Number(rule.maxConvertAmount) : null,
    }));

    return { items, total, page, pageSize };
  }

  async updateRule(ruleId: string, body: UpdateAutoConversionRuleBody) {
    const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!rule) {
      throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
    }

    const from = body.from ?? rule.fromCurrency;
    const to = body.to ?? rule.toCurrency;

    if (from === to) {
      throw new BadRequestException(adminErrorCodes.ADMIN_SOURCE_AND_TARGET_CURRENCIES_MUST_DIFFER);
    }

    if (body.targetBalance != null && (!Number.isFinite(body.targetBalance) || body.targetBalance < 0)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_TARGET_BALANCE);
    }

    if (body.maxConvertAmount != null && body.maxConvertAmount <= 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_MAX_CONVERT_AMOUNT);
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

  async listScheduledConversions(filters?: {
    q?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    includeDeleted?: boolean;
  }) {
    const search =
      typeof filters?.q === `string` && filters.q.trim().length > 0
        ? filters.q.trim().slice(0, AdminExchangeService.SEARCH_MAX_LEN)
        : undefined;
    const statusFilter =
      filters?.status &&
      Object.values($Enums.ScheduledFxConversionStatus).includes(filters.status as $Enums.ScheduledFxConversionStatus)
        ? (filters.status as $Enums.ScheduledFxConversionStatus)
        : undefined;
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 10));

    const where: Prisma.ScheduledFxConversionModelWhereInput = {
      ...(filters?.includeDeleted !== true && { deletedAt: null }),
      ...(statusFilter && { status: statusFilter }),
      ...(search && { consumer: { email: { contains: search, mode: `insensitive` } } }),
    };

    const [total, conversions] = await Promise.all([
      this.prisma.scheduledFxConversionModel.count({ where }),
      this.prisma.scheduledFxConversionModel.findMany({
        where,
        include: {
          consumer: { select: { id: true, email: true } },
        },
        orderBy: { executeAt: `desc` },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = conversions.map((conversion) => ({
      ...conversion,
      amount: Number(conversion.amount),
    }));

    return { items, total, page, pageSize };
  }

  async cancelScheduledConversion(conversionId: string) {
    const conversion = await this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, deletedAt: null },
    });

    if (!conversion) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.EXECUTED) {
      throw new BadRequestException(adminErrorCodes.ADMIN_CONVERSION_ALREADY_EXECUTED);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.CANCELLED) {
      throw new BadRequestException(adminErrorCodes.ADMIN_CONVERSION_ALREADY_CANCELLED);
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
