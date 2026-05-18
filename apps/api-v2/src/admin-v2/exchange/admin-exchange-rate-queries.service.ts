import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminV2ExchangeRateQuery } from './admin-v2-exchange-rate.query';
import { envs } from '../../envs';
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

function getRateReferenceAt(rate: { fetchedAt?: Date | null; effectiveAt: Date; createdAt: Date }) {
  return rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
}

@Injectable()
export class AdminExchangeRateQueriesService {
  constructor(private readonly rateQuery: AdminV2ExchangeRateQuery) {}

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

    const [total, rates] = await this.rateQuery.listRates({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: rates.map((rate) => this.mapRateListItem(rate, now)),
      total,
      page,
      pageSize,
    };
  }

  async getRateCase(rateId: string) {
    const rate = await this.rateQuery.findRateById(rateId);

    if (!rate) {
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }

    const approvalHistory = await this.rateQuery.listApprovalHistory(rate.id);

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
