import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { envs } from '../../envs';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2AssignmentsService, type AdminRef } from '../assignments/admin-v2-assignments.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizePage(value?: number) {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

function normalizePageSize(value?: number) {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

function toNullableIso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value && typeof value === `object` && !Array.isArray(value) ? { ...value } : {};
}

function deriveVersion(updatedAt: Date) {
  return updatedAt.getTime();
}

function parseOptionalString(value: unknown) {
  return typeof value === `string` && value.trim().length > 0 ? value.trim() : null;
}

function getRateReferenceAt(rate: { fetchedAt?: Date | null; effectiveAt: Date; createdAt: Date }) {
  return rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
}

@Injectable()
export class AdminV2ExchangeQueriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

  async listRates(params?: {
    page?: number;
    pageSize?: number;
    fromCurrency?: string;
    toCurrency?: string;
    provider?: string;
    status?: string;
    stale?: boolean;
  }) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const now = new Date();
    const staleCutoff = this.getRateStaleCutoff(now);
    const status = this.normalizeEnumValue(
      params?.status,
      Object.values($Enums.ExchangeRateStatus) as $Enums.ExchangeRateStatus[],
    );

    const where: Prisma.ExchangeRateModelWhereInput = {
      deletedAt: null,
      ...(params?.fromCurrency ? { fromCurrency: params.fromCurrency as $Enums.CurrencyCode } : {}),
      ...(params?.toCurrency ? { toCurrency: params.toCurrency as $Enums.CurrencyCode } : {}),
      ...(status ? { status } : {}),
      ...(params?.provider?.trim()
        ? {
            provider: {
              equals: params.provider.trim(),
              mode: `insensitive`,
            },
          }
        : {}),
      ...(params?.stale
        ? {
            OR: [{ fetchedAt: { lt: staleCutoff } }, { fetchedAt: null, effectiveAt: { lt: staleCutoff } }],
          }
        : {}),
    };

    const [total, rates] = await Promise.all([
      this.prisma.exchangeRateModel.count({ where }),
      this.prisma.exchangeRateModel.findMany({
        where,
        orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }, { id: `desc` }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rates.map((rate) => this.mapRateListItem(rate, now)),
      total,
      page,
      pageSize,
    };
  }

  async getRateCase(rateId: string) {
    const rate = await this.prisma.exchangeRateModel.findFirst({
      where: { id: rateId, deletedAt: null },
    });

    if (!rate) {
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }

    const approvalHistory = await this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resource: `exchange_rate`,
        resourceId: rate.id,
        action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rate_approve,
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        admin: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const now = new Date();
    const referenceAt = getRateReferenceAt(rate);
    const ageMinutes = Math.floor((now.getTime() - referenceAt.getTime()) / 60_000);
    const stalenessIndicator = {
      isStale: referenceAt.getTime() < this.getRateStaleCutoff(now).getTime(),
      ageMinutes,
      referenceAt: referenceAt.toISOString(),
      thresholdMinutes: Math.floor(this.getMaxRateAgeMs() / 60_000),
    };

    return {
      id: rate.id,
      core: {
        id: rate.id,
        sourceCurrency: rate.fromCurrency,
        targetCurrency: rate.toCurrency,
        rate: rate.rate.toString(),
        inverseRate: this.inverseRate(rate.rate),
        spreadBps: rate.spreadBps,
        confidence: rate.confidence,
        status: rate.status,
        provider: rate.provider,
        providerRateId: rate.providerRateId,
        fetchedAt: toNullableIso(rate.fetchedAt),
        effectiveAt: rate.effectiveAt.toISOString(),
        expiresAt: toNullableIso(rate.expiresAt),
        approvedAt: toNullableIso(rate.approvedAt),
        approvedBy: rate.approvedBy,
        createdAt: rate.createdAt.toISOString(),
        deletedAt: toNullableIso(rate.deletedAt),
      },
      approvalHistory: approvalHistory.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt.toISOString(),
        admin: {
          id: entry.admin.id,
          email: entry.admin.email,
        },
        metadata: asRecord(entry.metadata),
      })),
      stalenessIndicator,
      actionControls: {
        canApprove: rate.status === $Enums.ExchangeRateStatus.DRAFT,
        allowedActions: rate.status === $Enums.ExchangeRateStatus.DRAFT ? ([`exchange_rate_approve`] as const) : [],
      },
      version: deriveVersion(rate.updatedAt),
      updatedAt: rate.updatedAt.toISOString(),
      staleWarning: false,
      dataFreshnessClass: `exact`,
    };
  }

  async listRules(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    enabled?: boolean;
    fromCurrency?: string;
    toCurrency?: string;
  }) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const search = params?.q?.trim();
    const where: Prisma.WalletAutoConversionRuleModelWhereInput = {
      deletedAt: null,
      ...(typeof params?.enabled === `boolean` ? { enabled: params.enabled } : {}),
      ...(params?.fromCurrency ? { fromCurrency: params.fromCurrency as $Enums.CurrencyCode } : {}),
      ...(params?.toCurrency ? { toCurrency: params.toCurrency as $Enums.CurrencyCode } : {}),
      ...(search
        ? {
            OR: [{ consumer: { email: { contains: search, mode: `insensitive` } } }, { consumerId: search }],
          }
        : {}),
    };

    const [total, rules] = await Promise.all([
      this.prisma.walletAutoConversionRuleModel.count({ where }),
      this.prisma.walletAutoConversionRuleModel.findMany({
        where,
        include: {
          consumer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rules.map((rule) => this.mapRuleListItem(rule)),
      total,
      page,
      pageSize,
    };
  }

  async getRuleCase(ruleId: string) {
    const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
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

    if (!rule) {
      throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
    }

    return {
      id: rule.id,
      consumer: {
        id: rule.consumer.id,
        email: rule.consumer.email,
      },
      core: {
        id: rule.id,
        sourceCurrency: rule.fromCurrency,
        targetCurrency: rule.toCurrency,
        threshold: rule.targetBalance.toString(),
        maxConvertAmount: rule.maxConvertAmount?.toString() ?? null,
        minIntervalMinutes: rule.minIntervalMinutes,
        enabled: rule.enabled,
        nextRunAt: toNullableIso(rule.nextRunAt),
        lastRunAt: toNullableIso(rule.lastRunAt),
        createdAt: rule.createdAt.toISOString(),
      },
      lastExecution: this.mapRuleExecution(rule.metadata),
      actionControls: {
        canPause: rule.enabled,
        canResume: !rule.enabled,
        canRunNow: true,
        allowedActions: [
          ...(rule.enabled ? ([`exchange_rule_pause`] as const) : ([`exchange_rule_resume`] as const)),
          `exchange_rule_run_now`,
        ],
      },
      version: deriveVersion(rule.updatedAt),
      updatedAt: rule.updatedAt.toISOString(),
      staleWarning: false,
      dataFreshnessClass: `exact`,
    };
  }

  async listScheduledConversions(params?: { page?: number; pageSize?: number; q?: string; status?: string }) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const search = params?.q?.trim();
    const status = this.normalizeEnumValue(
      params?.status,
      Object.values($Enums.ScheduledFxConversionStatus) as $Enums.ScheduledFxConversionStatus[],
    );
    const where: Prisma.ScheduledFxConversionModelWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { consumer: { email: { contains: search, mode: `insensitive` } } },
              { consumerId: search },
              { id: search },
              { ledgerId: search },
            ],
          }
        : {}),
    };

    const [total, conversions] = await Promise.all([
      this.prisma.scheduledFxConversionModel.count({ where }),
      this.prisma.scheduledFxConversionModel.findMany({
        where,
        include: {
          consumer: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: [{ executeAt: `desc` }, { id: `desc` }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const ledgerIds = conversions
      .map((conversion) => conversion.ledgerId)
      .filter((value): value is string => Boolean(value));
    const ledgerEntryMap = await this.loadLedgerEntryMap(ledgerIds);
    const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource(
      `fx_conversion`,
      conversions.map((conversion) => conversion.id),
    );

    return {
      items: conversions.map((conversion) => this.mapScheduledListItem(conversion, ledgerEntryMap, assigneeMap)),
      total,
      page,
      pageSize,
    };
  }

  async getScheduledConversionCase(conversionId: string) {
    const conversion = await this.prisma.scheduledFxConversionModel.findFirst({
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

    if (!conversion) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }

    const linkedLedgerEntries = conversion.ledgerId
      ? await this.prisma.ledgerEntryModel.findMany({
          where: { ledgerId: conversion.ledgerId, deletedAt: null },
          orderBy: [{ createdAt: `asc` }, { id: `asc` }],
          include: {
            outcomes: {
              orderBy: [{ createdAt: `desc` }, { id: `desc` }],
              take: 1,
            },
          },
        })
      : [];
    const assignment = await this.assignmentsService.getAssignmentContextForResource(`fx_conversion`, conversion.id);

    return {
      id: conversion.id,
      consumer: {
        id: conversion.consumer.id,
        email: conversion.consumer.email,
      },
      core: {
        id: conversion.id,
        sourceCurrency: conversion.fromCurrency,
        targetCurrency: conversion.toCurrency,
        amount: conversion.amount.toString(),
        status: conversion.status,
        attempts: conversion.attempts,
        executeAt: conversion.executeAt.toISOString(),
        processingAt: toNullableIso(conversion.processingAt),
        executedAt: toNullableIso(conversion.executedAt),
        failedAt: toNullableIso(conversion.failedAt),
        createdAt: conversion.createdAt.toISOString(),
        updatedAt: conversion.updatedAt.toISOString(),
      },
      failureDetail: conversion.lastError,
      linkedRuleId: parseOptionalString(asRecord(conversion.metadata).ruleId),
      linkedLedgerEntries: linkedLedgerEntries.map((entry) => ({
        id: entry.id,
        ledgerId: entry.ledgerId,
        type: entry.type,
        amount: entry.amount.toString(),
        currencyCode: entry.currencyCode,
        effectiveStatus: entry.outcomes[0]?.status ?? entry.status,
        createdAt: entry.createdAt.toISOString(),
      })),
      actionControls: {
        canForceExecute: this.isScheduledForceExecutable(conversion.status),
        canCancel: conversion.status === $Enums.ScheduledFxConversionStatus.PENDING,
        allowedActions: [
          ...(this.isScheduledForceExecutable(conversion.status)
            ? ([`exchange_scheduled_force_execute`] as const)
            : []),
          ...(conversion.status === $Enums.ScheduledFxConversionStatus.PENDING
            ? ([`exchange_scheduled_cancel`] as const)
            : []),
        ],
      },
      version: deriveVersion(conversion.updatedAt),
      updatedAt: conversion.updatedAt.toISOString(),
      staleWarning: false,
      dataFreshnessClass: `exact`,
      assignment,
    };
  }

  private normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]) {
    if (!value?.trim()) {
      return undefined;
    }
    return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
  }

  private mapRateListItem(
    rate: {
      id: string;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      rate: Prisma.Decimal;
      spreadBps: number | null;
      confidence: number | null;
      status: $Enums.ExchangeRateStatus;
      provider: string | null;
      effectiveAt: Date;
      fetchedAt: Date | null;
      expiresAt: Date | null;
      approvedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    now: Date,
  ) {
    const referenceAt = getRateReferenceAt(rate);
    return {
      id: rate.id,
      sourceCurrency: rate.fromCurrency,
      targetCurrency: rate.toCurrency,
      rate: rate.rate.toString(),
      inverseRate: this.inverseRate(rate.rate),
      spreadBps: rate.spreadBps,
      confidence: rate.confidence,
      status: rate.status,
      provider: rate.provider,
      effectiveAt: rate.effectiveAt.toISOString(),
      fetchedAt: toNullableIso(rate.fetchedAt),
      expiresAt: toNullableIso(rate.expiresAt),
      approvedAt: toNullableIso(rate.approvedAt),
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
      stalenessIndicator: {
        isStale: referenceAt.getTime() < this.getRateStaleCutoff(now).getTime(),
        referenceAt: referenceAt.toISOString(),
        ageMinutes: Math.floor((now.getTime() - referenceAt.getTime()) / 60_000),
      },
      version: deriveVersion(rate.updatedAt),
    };
  }

  private mapRuleListItem(rule: {
    id: string;
    consumer: { id: string; email: string | null };
    fromCurrency: $Enums.CurrencyCode;
    toCurrency: $Enums.CurrencyCode;
    targetBalance: Prisma.Decimal;
    maxConvertAmount: Prisma.Decimal | null;
    minIntervalMinutes: number;
    enabled: boolean;
    nextRunAt: Date | null;
    lastRunAt: Date | null;
    metadata: Prisma.JsonValue | null;
    updatedAt: Date;
  }) {
    return {
      id: rule.id,
      consumer: {
        id: rule.consumer.id,
        email: rule.consumer.email,
      },
      sourceCurrency: rule.fromCurrency,
      targetCurrency: rule.toCurrency,
      threshold: rule.targetBalance.toString(),
      maxConvertAmount: rule.maxConvertAmount?.toString() ?? null,
      minIntervalMinutes: rule.minIntervalMinutes,
      enabled: rule.enabled,
      nextRunAt: toNullableIso(rule.nextRunAt),
      lastRunAt: toNullableIso(rule.lastRunAt),
      lastExecution: this.mapRuleExecution(rule.metadata),
      version: deriveVersion(rule.updatedAt),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private mapRuleExecution(metadata: Prisma.JsonValue | null | undefined) {
    const execution = asRecord(metadata).lastExecution;
    if (!execution || typeof execution !== `object` || Array.isArray(execution)) {
      return null;
    }
    return execution as Record<string, unknown>;
  }

  private isScheduledForceExecutable(status: $Enums.ScheduledFxConversionStatus) {
    return (
      status === $Enums.ScheduledFxConversionStatus.PENDING || status === $Enums.ScheduledFxConversionStatus.FAILED
    );
  }

  private async loadLedgerEntryMap(ledgerIds: string[]) {
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

  private mapScheduledListItem(
    conversion: {
      id: string;
      consumer: { id: string; email: string | null };
      amount: Prisma.Decimal;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      status: $Enums.ScheduledFxConversionStatus;
      attempts: number;
      executeAt: Date;
      processingAt: Date | null;
      executedAt: Date | null;
      failedAt: Date | null;
      lastError: string | null;
      ledgerId: string | null;
      metadata: Prisma.JsonValue | null;
      updatedAt: Date;
    },
    ledgerEntryMap: Map<
      string,
      { id: string; type: $Enums.LedgerEntryType; amount: string; currencyCode: $Enums.CurrencyCode }
    >,
    assigneeMap: Map<string, AdminRef>,
  ) {
    const linkedLedger = conversion.ledgerId ? (ledgerEntryMap.get(conversion.ledgerId) ?? null) : null;
    return {
      id: conversion.id,
      consumer: {
        id: conversion.consumer.id,
        email: conversion.consumer.email,
      },
      amount: conversion.amount.toString(),
      sourceCurrency: conversion.fromCurrency,
      targetCurrency: conversion.toCurrency,
      status: conversion.status,
      attempts: conversion.attempts,
      retryCount: Math.max(0, conversion.attempts - 1),
      executeAt: conversion.executeAt.toISOString(),
      processingAt: toNullableIso(conversion.processingAt),
      executedAt: toNullableIso(conversion.executedAt),
      failedAt: toNullableIso(conversion.failedAt),
      failureDetail: conversion.lastError,
      linkedRuleId: parseOptionalString(asRecord(conversion.metadata).ruleId),
      ledgerId: conversion.ledgerId,
      linkedLedgerEntry: linkedLedger,
      version: deriveVersion(conversion.updatedAt),
      updatedAt: conversion.updatedAt.toISOString(),
      assignedTo: assigneeMap.get(conversion.id) ?? null,
    };
  }

  private inverseRate(rate: Prisma.Decimal) {
    const numeric = Number(rate);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return Number((1 / numeric).toFixed(8)).toString();
  }

  private getMaxRateAgeMs() {
    const hours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
    if (!Number.isFinite(hours) || hours <= 0) {
      return 24 * 60 * 60 * 1000;
    }
    return hours * 60 * 60 * 1000;
  }

  private getRateStaleCutoff(now: Date) {
    return new Date(now.getTime() - this.getMaxRateAgeMs());
  }
}
