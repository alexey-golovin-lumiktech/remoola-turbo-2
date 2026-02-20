import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConvertCurrencyBody } from './dto/convert.dto';
import { CreateAutoConversionRuleBody } from './dto/create-auto-conversion-rule.dto';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';
import { UpdateAutoConversionRuleBody } from './dto/update-auto-conversion-rule.dto';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

@Injectable()
export class ConsumerExchangeService {
  private readonly logger = new Logger(ConsumerExchangeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    if (from === to) return { rate: 1 };

    const now = new Date();
    const rate = await this.prisma.exchangeRateModel.findFirst({
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

    if (!rate) throw new NotFoundException(errorCodes.RATE_NOT_AVAILABLE);

    const referenceTime = rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
    if (referenceTime) {
      const maxAgeMs = this.getMaxRateAgeMs();
      if (now.getTime() - referenceTime.getTime() > maxAgeMs) {
        throw new BadRequestException(errorCodes.RATE_STALE);
      }
    }

    const baseRate = Number(rate.rate);
    const effectiveRate =
      rate.rateBid != null
        ? Number(rate.rateBid)
        : rate.spreadBps != null
          ? Number((baseRate * (1 - rate.spreadBps / 10_000)).toFixed(8))
          : baseRate;

    return { rate: effectiveRate };
  }

  async getBalanceByCurrency(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    const rows = await this.prisma.ledgerEntryModel.groupBy({
      by: [`currencyCode`],
      where: {
        consumerId,
        status: $Enums.TransactionStatus.COMPLETED, // 👈 only settled funds
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    const result: Record<$Enums.CurrencyCode, number> = {} as any;

    for (const row of rows) {
      result[row.currencyCode] = Number(row._sum.amount ?? 0);
    }

    return result;
  }

  async convert(consumerId: string, body: ConvertCurrencyBody) {
    return this.convertInternal(consumerId, body, {
      metadata: { source: `manual` },
    });
  }

  async quote(body: ConvertCurrencyBody) {
    const rate = await this.getRate(body.from, body.to);
    const targetAmount = this.roundToCurrency(body.amount * rate.rate, body.to);
    return {
      from: body.from,
      to: body.to,
      rate: rate.rate,
      sourceAmount: body.amount,
      targetAmount,
    };
  }

  async getRatesBatch(pairs: { from: $Enums.CurrencyCode; to: $Enums.CurrencyCode }[]) {
    const results = await Promise.all(
      pairs.map(async (pair) => {
        const rate = await this.getRate(pair.from, pair.to);
        return { from: pair.from, to: pair.to, rate: rate.rate };
      }),
    );
    return { data: results };
  }

  async listAutoConversionRules(
    consumerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{
    items: ReturnType<ConsumerExchangeService[`normalizeRule`]>[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));

    const [total, rules] = await Promise.all([
      this.prisma.walletAutoConversionRuleModel.count({ where: { consumerId, deletedAt: null } }),
      this.prisma.walletAutoConversionRuleModel.findMany({
        where: { consumerId, deletedAt: null },
        orderBy: { createdAt: `desc` },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    const items = rules.map((rule) => this.normalizeRule(rule));
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async createAutoConversionRule(consumerId: string, body: CreateAutoConversionRuleBody) {
    const { from, to } = body;

    if (from === to) {
      throw new BadRequestException(errorCodes.CURRENCIES_MUST_DIFFER_CREATE_RULE);
    }

    if (!Number.isFinite(body.targetBalance) || body.targetBalance < 0) {
      throw new BadRequestException(errorCodes.INVALID_TARGET_BALANCE_CREATE_RULE);
    }

    if (body.maxConvertAmount != null && body.maxConvertAmount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_MAX_CONVERT_AMOUNT_CREATE_RULE);
    }

    const minIntervalMinutes = body.minIntervalMinutes ?? 60;

    const rule = await this.prisma.walletAutoConversionRuleModel.create({
      data: {
        consumerId,
        fromCurrency: from,
        toCurrency: to,
        targetBalance: body.targetBalance,
        maxConvertAmount: body.maxConvertAmount ?? null,
        minIntervalMinutes,
        nextRunAt: new Date(),
        enabled: body.enabled ?? true,
      },
    });
    return this.normalizeRule(rule);
  }

  async updateAutoConversionRule(consumerId: string, ruleId: string, body: UpdateAutoConversionRuleBody) {
    const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, consumerId, deletedAt: null },
    });

    if (!rule) {
      throw new NotFoundException(errorCodes.RULE_NOT_FOUND_UPDATE);
    }

    const from = body.from ?? rule.fromCurrency;
    const to = body.to ?? rule.toCurrency;

    if (from === to) {
      throw new BadRequestException(errorCodes.CURRENCIES_MUST_DIFFER_UPDATE_RULE);
    }

    if (body.targetBalance != null && (!Number.isFinite(body.targetBalance) || body.targetBalance < 0)) {
      throw new BadRequestException(errorCodes.INVALID_TARGET_BALANCE_UPDATE_RULE);
    }

    if (body.maxConvertAmount != null && body.maxConvertAmount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_MAX_CONVERT_AMOUNT_UPDATE_RULE);
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
    return this.normalizeRule(updated);
  }

  async deleteAutoConversionRule(consumerId: string, ruleId: string) {
    const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, consumerId, deletedAt: null },
    });

    if (!rule) {
      throw new NotFoundException(errorCodes.RULE_NOT_FOUND_DELETE);
    }

    await this.prisma.walletAutoConversionRuleModel.update({
      where: { id: rule.id },
      data: { deletedAt: new Date(), enabled: false },
    });

    return { ruleId: rule.id };
  }

  async listScheduledConversions(
    consumerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{
    items: ReturnType<ConsumerExchangeService[`normalizeScheduledConversion`]>[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));

    const [total, conversions] = await Promise.all([
      this.prisma.scheduledFxConversionModel.count({ where: { consumerId, deletedAt: null } }),
      this.prisma.scheduledFxConversionModel.findMany({
        where: { consumerId, deletedAt: null },
        orderBy: { executeAt: `desc` },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    const items = conversions.map((conversion) => this.normalizeScheduledConversion(conversion));
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async scheduleConversion(consumerId: string, body: ScheduleConversionBody) {
    const { from, to, amount } = body;

    if (from === to) {
      throw new BadRequestException(errorCodes.CURRENCIES_MUST_DIFFER_SCHEDULE);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_SCHEDULE);
    }

    const executeAt = new Date(body.executeAt);
    if (Number.isNaN(executeAt.getTime())) {
      throw new BadRequestException(errorCodes.INVALID_EXECUTE_AT);
    }

    if (executeAt.getTime() <= Date.now()) {
      throw new BadRequestException(errorCodes.EXECUTE_AT_MUST_BE_FUTURE);
    }

    const conversion = await this.prisma.scheduledFxConversionModel.create({
      data: {
        consumerId,
        fromCurrency: from,
        toCurrency: to,
        amount,
        executeAt,
      },
    });
    return this.normalizeScheduledConversion(conversion);
  }

  async cancelScheduledConversion(consumerId: string, conversionId: string) {
    const conversion = await this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, consumerId, deletedAt: null },
    });

    if (!conversion) {
      throw new NotFoundException(errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_CANCEL);
    }

    if (conversion.status !== $Enums.ScheduledFxConversionStatus.PENDING) {
      throw new BadRequestException(errorCodes.ONLY_PENDING_CONVERSIONS_CAN_CANCEL);
    }

    await this.prisma.scheduledFxConversionModel.update({
      where: { id: conversion.id },
      data: {
        status: $Enums.ScheduledFxConversionStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    return { conversionId: conversion.id };
  }

  async processDueScheduledConversions() {
    const now = new Date();
    const due = await this.prisma.scheduledFxConversionModel.findMany({
      where: {
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        executeAt: { lte: now },
        deletedAt: null,
      },
      orderBy: { executeAt: `asc` },
      take: 25,
    });

    for (const conversion of due) {
      const claimed = await this.prisma.scheduledFxConversionModel.updateMany({
        where: {
          id: conversion.id,
          status: $Enums.ScheduledFxConversionStatus.PENDING,
        },
        data: {
          status: $Enums.ScheduledFxConversionStatus.PROCESSING,
          processingAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      if (!claimed.count) continue;

      try {
        const result = await this.convertInternal(
          conversion.consumerId,
          {
            from: conversion.fromCurrency,
            to: conversion.toCurrency,
            amount: Number(conversion.amount),
          },
          {
            metadata: { source: `scheduled`, scheduledConversionId: conversion.id },
            idempotencyKeyPrefix: `scheduled:${conversion.id}`,
          },
        );

        await this.prisma.scheduledFxConversionModel.update({
          where: { id: conversion.id },
          data: {
            status: $Enums.ScheduledFxConversionStatus.EXECUTED,
            executedAt: new Date(),
            ledgerId: result.ledgerId,
            lastError: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unknown error`;
        this.logger.warn(`Scheduled conversion failed (${conversion.id}): ${message}`);

        await this.prisma.scheduledFxConversionModel.update({
          where: { id: conversion.id },
          data: {
            status: $Enums.ScheduledFxConversionStatus.FAILED,
            failedAt: new Date(),
            lastError: message,
          },
        });
      }
    }
  }

  async executeScheduledConversionNow(conversionId: string, initiatedBy?: { source: string; actorId?: string }) {
    const conversion = await this.prisma.scheduledFxConversionModel.findFirst({
      where: { id: conversionId, deletedAt: null },
    });

    if (!conversion) {
      throw new NotFoundException(errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_EXECUTE);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.EXECUTED) {
      throw new BadRequestException(errorCodes.CONVERSION_ALREADY_EXECUTED);
    }

    if (conversion.status === $Enums.ScheduledFxConversionStatus.CANCELLED) {
      throw new BadRequestException(errorCodes.CONVERSION_CANCELLED);
    }

    const claimed = await this.prisma.scheduledFxConversionModel.updateMany({
      where: {
        id: conversion.id,
        status: { in: [$Enums.ScheduledFxConversionStatus.PENDING, $Enums.ScheduledFxConversionStatus.FAILED] },
      },
      data: {
        status: $Enums.ScheduledFxConversionStatus.PROCESSING,
        processingAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    if (!claimed.count) {
      throw new BadRequestException(errorCodes.CONVERSION_ALREADY_PROCESSING);
    }

    try {
      const result = await this.convertInternal(
        conversion.consumerId,
        {
          from: conversion.fromCurrency,
          to: conversion.toCurrency,
          amount: Number(conversion.amount),
        },
        {
          metadata: {
            source: initiatedBy?.source ?? `admin`,
            initiatedBy: initiatedBy?.actorId ?? null,
            scheduledConversionId: conversion.id,
          },
          idempotencyKeyPrefix: `scheduled:${conversion.id}`,
        },
      );

      await this.prisma.scheduledFxConversionModel.update({
        where: { id: conversion.id },
        data: {
          status: $Enums.ScheduledFxConversionStatus.EXECUTED,
          executedAt: new Date(),
          ledgerId: result.ledgerId,
          lastError: null,
        },
      });

      return {
        conversionId: conversion.id,
        ledgerId: result.ledgerId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown error`;
      this.logger.warn(`Admin forced conversion failed (${conversion.id}): ${message}`);

      await this.prisma.scheduledFxConversionModel.update({
        where: { id: conversion.id },
        data: {
          status: $Enums.ScheduledFxConversionStatus.FAILED,
          failedAt: new Date(),
          lastError: message,
        },
      });

      throw error;
    }
  }

  async processDueAutoConversionRules() {
    const now = new Date();
    const rules = await this.prisma.walletAutoConversionRuleModel.findMany({
      where: {
        enabled: true,
        deletedAt: null,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      orderBy: { nextRunAt: `asc` },
      take: 50,
    });

    for (const rule of rules) {
      const claimed = await this.prisma.walletAutoConversionRuleModel.updateMany({
        where: {
          id: rule.id,
          enabled: true,
          deletedAt: null,
          OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
        },
        data: {
          lastRunAt: now,
          nextRunAt: new Date(now.getTime() + rule.minIntervalMinutes * 60 * 1000),
        },
      });

      if (!claimed.count) continue;

      try {
        await this.executeAutoConversionRule(rule, {
          source: `auto_rule`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unknown error`;
        this.logger.warn(`Auto conversion rule failed (${rule.id}): ${message}`);
      }
    }
  }

  async runAutoConversionRuleNow(ruleId: string, initiatedBy?: { source: string; actorId?: string }) {
    const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!rule) {
      throw new NotFoundException(errorCodes.RULE_NOT_FOUND_CONVERT);
    }

    const now = new Date();
    await this.prisma.walletAutoConversionRuleModel.update({
      where: { id: rule.id },
      data: {
        lastRunAt: now,
        nextRunAt: new Date(now.getTime() + rule.minIntervalMinutes * 60 * 1000),
      },
    });

    return this.executeAutoConversionRule(rule, {
      source: initiatedBy?.source ?? `manual_rule_run`,
      actorId: initiatedBy?.actorId,
    });
  }

  private async executeAutoConversionRule(
    rule: {
      id: string;
      consumerId: string;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      targetBalance: unknown;
      maxConvertAmount: unknown;
    },
    initiatedBy: { source: string; actorId?: string },
  ) {
    const balances = await this.getBalanceByCurrency(rule.consumerId);
    const available = balances[rule.fromCurrency] ?? 0;
    const targetBalance = Number(rule.targetBalance);

    if (available <= targetBalance) {
      return {
        ruleId: rule.id,
        converted: false,
        reason: `balance_below_target`,
      };
    }

    let amountToConvert = available - targetBalance;
    if (rule.maxConvertAmount != null) {
      amountToConvert = Math.min(amountToConvert, Number(rule.maxConvertAmount));
    }

    if (amountToConvert <= 0) {
      return {
        ruleId: rule.id,
        converted: false,
        reason: `no_amount_to_convert`,
      };
    }

    const runAt = new Date();
    const result = await this.convertInternal(
      rule.consumerId,
      {
        from: rule.fromCurrency,
        to: rule.toCurrency,
        amount: amountToConvert,
      },
      {
        metadata: {
          source: initiatedBy.source,
          initiatedBy: initiatedBy.actorId ?? null,
          ruleId: rule.id,
          runAt: runAt.toISOString(),
        },
        idempotencyKeyPrefix: `rule:${rule.id}:${runAt.toISOString()}`,
      },
    );

    return {
      ruleId: rule.id,
      converted: true,
      ledgerId: result.ledgerId,
    };
  }

  getCurrencies() {
    return Object.values($Enums.CurrencyCode);
  }

  private normalizeRule(rule: { targetBalance: any; maxConvertAmount: any }) {
    return {
      ...rule,
      targetBalance: Number(rule.targetBalance),
      maxConvertAmount: rule.maxConvertAmount != null ? Number(rule.maxConvertAmount) : null,
    };
  }

  private normalizeScheduledConversion(conversion: { amount: any }) {
    return {
      ...conversion,
      amount: Number(conversion.amount),
    };
  }

  private async convertInternal(
    consumerId: string,
    body: ConvertCurrencyBody,
    options?: {
      metadata?: Record<string, unknown>;
      idempotencyKeyPrefix?: string;
    },
  ) {
    const { amount, from, to } = body;

    if (from === to) {
      throw new BadRequestException(errorCodes.CANNOT_CONVERT_SAME_CURRENCY);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_CONVERT);
    }

    const balances = await this.getBalanceByCurrency(consumerId);
    const available = balances[from] ?? 0;

    if (amount > available) {
      throw new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
    }

    const rate = await this.getRate(from, to);
    const converted = this.roundToCurrency(amount * rate.rate, to);

    const idempotencyKeyPrefix = options?.idempotencyKeyPrefix;
    const targetKey = idempotencyKeyPrefix ? `${idempotencyKeyPrefix}:target` : null;
    const sourceKey = idempotencyKeyPrefix ? `${idempotencyKeyPrefix}:source` : null;

    if (idempotencyKeyPrefix) {
      const [existingTarget, existingSource] = await Promise.all([
        this.prisma.ledgerEntryModel.findFirst({
          where: { idempotencyKey: targetKey ?? undefined, consumerId },
        }),
        this.prisma.ledgerEntryModel.findFirst({
          where: { idempotencyKey: sourceKey ?? undefined, consumerId },
        }),
      ]);

      if (existingTarget) {
        const metadata = (existingTarget.metadata ?? {}) as Record<string, unknown>;
        const rateFromMetadata = typeof metadata.rate === `number` ? metadata.rate : undefined;
        return {
          from,
          to,
          rate: rateFromMetadata ?? rate.rate,
          sourceAmount: amount,
          targetAmount: Number(existingTarget.amount),
          ledgerId: existingTarget.ledgerId,
          entryId: existingTarget.id,
        };
      }

      if (existingSource && !existingTarget) {
        const sourceMetadata = (existingSource.metadata ?? {}) as Record<string, unknown>;
        const rateFromMetadata = typeof sourceMetadata.rate === `number` ? sourceMetadata.rate : rate.rate;
        const mergedMetadata = {
          ...sourceMetadata,
          ...(options?.metadata ?? {}),
          from,
          to,
          rate: rateFromMetadata,
        };
        const sourceAmount = Math.abs(Number(existingSource.amount));
        const convertedAmount = this.roundToCurrency(sourceAmount * rateFromMetadata, to);

        const income = await this.prisma.ledgerEntryModel.create({
          data: {
            ledgerId: existingSource.ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
            currencyCode: to,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: +convertedAmount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: targetKey ?? undefined,
            metadata: mergedMetadata,
          },
        });

        return {
          from,
          to,
          rate: rateFromMetadata,
          sourceAmount,
          targetAmount: convertedAmount,
          ledgerId: income.ledgerId,
          entryId: income.id,
        };
      }
    }

    const ledgerId = randomUUID();
    const metadata = { from, to, rate: rate.rate, ...(options?.metadata ?? {}) };

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${consumerId}::text)::bigint)`);

      const balanceResult = await tx.ledgerEntryModel.aggregate({
        where: {
          consumerId,
          currencyCode: from,
          status: $Enums.TransactionStatus.COMPLETED,
          deletedAt: null,
        },
        _sum: { amount: true },
      });
      const balanceInsideTx = Number(balanceResult._sum.amount ?? 0);
      if (amount > balanceInsideTx) {
        throw new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
      }

      // 1️⃣ Source currency — money leaves
      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: from,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: -amount, // SIGNED
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: sourceKey ?? undefined,
          metadata,
        },
      });

      // 2️⃣ Target currency — money enters
      const income = await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
          currencyCode: to,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: +converted, // SIGNED
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: targetKey ?? undefined,
          metadata,
        },
      });

      return {
        from,
        to,
        rate: rate.rate,
        sourceAmount: amount,
        targetAmount: converted,
        ledgerId,
        entryId: income.id,
      };
    });
  }

  private roundToCurrency(amount: number, currency: $Enums.CurrencyCode) {
    const digits = getCurrencyFractionDigits(currency);
    return Number(amount.toFixed(digits));
  }

  private getMaxRateAgeMs() {
    const hours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
    if (!Number.isFinite(hours) || hours <= 0) {
      return 24 * 60 * 60 * 1000;
    }
    return hours * 60 * 60 * 1000;
  }
}
