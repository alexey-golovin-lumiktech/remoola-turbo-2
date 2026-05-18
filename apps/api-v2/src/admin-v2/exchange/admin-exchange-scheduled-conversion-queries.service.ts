import { Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef } from '@remoola/api-types';
import { $Enums, type Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminV2ExchangeScheduledConversionQuery } from './admin-v2-exchange-scheduled-conversion.query';
import { deriveVersion, toNullableIso } from '../admin-v2-version-utils';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';

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

function parseOptionalString(value: unknown) {
  return typeof value === `string` && value.trim().length > 0 ? value.trim() : null;
}

@Injectable()
export class AdminExchangeScheduledConversionQueriesService {
  constructor(
    private readonly scheduledConversionQuery: AdminV2ExchangeScheduledConversionQuery,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

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

    const [total, conversions] = await this.scheduledConversionQuery.listScheduledConversions({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const ledgerIds = conversions
      .map((conversion) => conversion.ledgerId)
      .filter((value): value is string => Boolean(value));
    const ledgerEntryMap = await this.scheduledConversionQuery.loadLedgerEntryMap(ledgerIds);
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
    const conversion = await this.scheduledConversionQuery.findScheduledConversionById(conversionId);

    if (!conversion) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }

    const linkedLedgerEntries = conversion.ledgerId
      ? await this.scheduledConversionQuery.listLinkedLedgerEntries(conversion.ledgerId)
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

  private isScheduledForceExecutable(status: $Enums.ScheduledFxConversionStatus) {
    return (
      status === $Enums.ScheduledFxConversionStatus.PENDING || status === $Enums.ScheduledFxConversionStatus.FAILED
    );
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
}
