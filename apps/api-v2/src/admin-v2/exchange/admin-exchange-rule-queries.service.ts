import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminV2ExchangeRuleQuery } from './admin-v2-exchange-rule.query';
import { deriveVersion, toNullableIso } from '../admin-v2-version-utils';

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

function asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value && typeof value === `object` && !Array.isArray(value) ? { ...value } : {};
}

@Injectable()
export class AdminExchangeRuleQueriesService {
  constructor(private readonly ruleQuery: AdminV2ExchangeRuleQuery) {}

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

    const [total, rules] = await this.ruleQuery.listRules({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: rules.map((rule) => this.mapRuleListItem(rule)),
      total,
      page,
      pageSize,
    };
  }

  async getRuleCase(ruleId: string) {
    const rule = await this.ruleQuery.findRuleById(ruleId);

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
}
