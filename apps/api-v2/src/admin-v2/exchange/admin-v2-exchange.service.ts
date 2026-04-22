import { randomUUID } from 'crypto';

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { envs } from '../../envs';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { PrismaService } from '../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../shared-common';
import { AdminV2DomainEventsService, type AdminV2DomainEvent } from '../admin-v2-domain-events.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AssignmentsService, type AdminRef } from '../assignments/admin-v2-assignments.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type RuleExecutionStatus = `executed` | `failed`;

type RuleExecutionSummary = {
  status: RuleExecutionStatus;
  reason: string;
  executedAt: string;
  ledgerId?: string | null;
  targetAmount?: string | null;
  sourceAmount?: string | null;
  idempotencyKey?: string | null;
  source: string;
  actorId?: string | null;
};

type LockedRuleRow = {
  id: string;
  consumer_id: string;
  from_currency: $Enums.CurrencyCode;
  to_currency: $Enums.CurrencyCode;
  target_balance: Prisma.Decimal;
  max_convert_amount: Prisma.Decimal | null;
  min_interval_minutes: number;
  next_run_at: Date | null;
  last_run_at: Date | null;
  enabled: boolean;
  metadata: Prisma.JsonValue | null;
  updated_at: Date;
  deleted_at: Date | null;
  consumer_email: string | null;
};

type LockedScheduledRow = {
  id: string;
  consumer_id: string;
  from_currency: $Enums.CurrencyCode;
  to_currency: $Enums.CurrencyCode;
  amount: Prisma.Decimal;
  status: $Enums.ScheduledFxConversionStatus;
  execute_at: Date;
  processing_at: Date | null;
  executed_at: Date | null;
  failed_at: Date | null;
  attempts: number;
  last_error: string | null;
  ledger_id: string | null;
  metadata: Prisma.JsonValue | null;
  updated_at: Date;
  deleted_at: Date | null;
  consumer_email: string | null;
};

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

function buildStaleVersionPayload(resourceLabel: string, currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `${resourceLabel} has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

function parseOptionalString(value: unknown) {
  return typeof value === `string` && value.trim().length > 0 ? value.trim() : null;
}

function parseUuidOrThrow(raw: string | null | undefined, headerName: string) {
  const value = raw?.trim();
  if (!value) {
    throw new BadRequestException(`${headerName} header is required`);
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new BadRequestException(`${headerName} header must be a UUID`);
  }
  return value;
}

function getRateReferenceAt(rate: { fetchedAt?: Date | null; effectiveAt: Date; createdAt: Date }) {
  return rate.fetchedAt ?? rate.effectiveAt ?? rate.createdAt;
}

function mergeMetadata(base: Prisma.JsonValue | null | undefined, patch: Record<string, unknown>) {
  return {
    ...asRecord(base),
    ...patch,
  } as Prisma.InputJsonValue;
}

@Injectable()
export class AdminV2ExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly balanceService: BalanceCalculationService,
    private readonly domainEvents: AdminV2DomainEventsService,
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

  async approveRate(
    rateId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number; reason?: string | null },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for exchange rate approval`);
    }

    const reason = parseOptionalString(body.reason);
    if (!reason) {
      throw new BadRequestException(`Approval reason is required`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-rate-approve:${rateId}`,
      key: meta.idempotencyKey,
      payload: {
        rateId,
        expectedVersion,
        confirmed: true,
        reason,
      },
      execute: async () => {
        const rate = await this.prisma.exchangeRateModel.findFirst({
          where: { id: rateId, deletedAt: null },
        });

        if (!rate) {
          throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
        }

        if (deriveVersion(rate.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rate`, rate.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const locked = await tx.exchangeRateModel.findFirst({
            where: { id: rateId, deletedAt: null },
          });

          if (!locked) {
            throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
          }

          if (deriveVersion(locked.updatedAt) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Exchange rate`, locked.updatedAt));
          }

          if (locked.status !== $Enums.ExchangeRateStatus.DRAFT) {
            throw new ConflictException(`Only draft exchange rates can be approved`);
          }

          const approvedAt = new Date();
          const updated = await tx.exchangeRateModel.update({
            where: { id: locked.id },
            data: {
              status: $Enums.ExchangeRateStatus.APPROVED,
              approvedAt,
              approvedBy: adminId,
              updatedBy: adminId,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rate_approve,
              resource: `exchange_rate`,
              resourceId: updated.id,
              metadata: {
                confirmed: true,
                reason,
                expectedVersion,
                fromCurrency: updated.fromCurrency,
                toCurrency: updated.toCurrency,
                provider: updated.provider,
                effectiveAt: updated.effectiveAt.toISOString(),
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            rateId: updated.id,
            status: updated.status,
            approvedAt: approvedAt.toISOString(),
            version: deriveVersion(updated.updatedAt),
          };
        });
      },
    });
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

  async pauseRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-rule-pause:${ruleId}`,
      key: meta.idempotencyKey,
      payload: {
        ruleId,
        expectedVersion,
      },
      execute: async () => {
        const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
          where: { id: ruleId, deletedAt: null },
        });

        if (!rule) {
          throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
        }

        if (deriveVersion(rule.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, rule.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const locked = await this.lockRuleRow(tx, ruleId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, locked.updated_at));
          }
          if (!locked.enabled) {
            throw new ConflictException(`Exchange rule is already paused`);
          }

          const updated = await tx.walletAutoConversionRuleModel.update({
            where: { id: locked.id },
            data: {
              enabled: false,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rule_pause,
              resource: `exchange_rule`,
              resourceId: updated.id,
              metadata: {
                expectedVersion,
                enabledBefore: true,
                enabledAfter: false,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            ruleId: updated.id,
            enabled: updated.enabled,
            version: deriveVersion(updated.updatedAt),
          };
        });
      },
    });
  }

  async resumeRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-rule-resume:${ruleId}`,
      key: meta.idempotencyKey,
      payload: {
        ruleId,
        expectedVersion,
      },
      execute: async () => {
        const rule = await this.prisma.walletAutoConversionRuleModel.findFirst({
          where: { id: ruleId, deletedAt: null },
        });

        if (!rule) {
          throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
        }

        if (deriveVersion(rule.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, rule.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const locked = await this.lockRuleRow(tx, ruleId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, locked.updated_at));
          }
          if (locked.enabled) {
            throw new ConflictException(`Exchange rule is already active`);
          }

          const updated = await tx.walletAutoConversionRuleModel.update({
            where: { id: locked.id },
            data: {
              enabled: true,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rule_resume,
              resource: `exchange_rule`,
              resourceId: updated.id,
              metadata: {
                expectedVersion,
                enabledBefore: false,
                enabledAfter: true,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            ruleId: updated.id,
            enabled: updated.enabled,
            version: deriveVersion(updated.updatedAt),
          };
        });
      },
    });
  }

  async runRuleNow(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    const idempotencyKey = parseUuidOrThrow(meta.idempotencyKey, `Idempotency-Key`);
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    const result = await this.idempotency.execute({
      adminId,
      scope: `exchange-rule-run-now:${ruleId}`,
      key: idempotencyKey,
      payload: {
        ruleId,
        expectedVersion,
      },
      execute: async () => {
        const preflight = await this.prisma.walletAutoConversionRuleModel.findFirst({
          where: { id: ruleId, deletedAt: null },
        });

        if (!preflight) {
          throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
        }

        if (deriveVersion(preflight.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, preflight.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const locked = await this.lockRuleRow(tx, ruleId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, locked.updated_at));
          }
          if (!(await this.tryActionLock(tx, `exchange_rule_run_now:${ruleId}`))) {
            throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
          }

          const now = new Date();
          const execution = await this.executeRuleConversion(tx, locked, {
            source: `admin_rule_run`,
            actorId: adminId,
            idempotencyKey,
            now,
          });

          const updatedRule = await tx.walletAutoConversionRuleModel.update({
            where: { id: locked.id },
            data: {
              lastRunAt: now,
              nextRunAt: new Date(now.getTime() + locked.min_interval_minutes * 60 * 1000),
              metadata: mergeMetadata(locked.metadata, {
                lastExecution: execution.summary,
              }),
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rule_run_now,
              resource: `exchange_rule`,
              resourceId: locked.id,
              metadata: {
                expectedVersion,
                status: execution.summary.status,
                reason: execution.summary.reason,
                ledgerId: execution.summary.ledgerId ?? null,
                idempotencyKey,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            ruleId: locked.id,
            version: deriveVersion(updatedRule.updatedAt),
            nextRunAt: toNullableIso(updatedRule.nextRunAt),
            lastRunAt: toNullableIso(updatedRule.lastRunAt),
            ...execution,
          };
        });
      },
    });

    await this.publishRuleEvent(adminId, ruleId, result.version, result.summary);
    return result;
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
    const assigneeMap = await this.getActiveAssignees(conversions.map((conversion) => conversion.id));

    return {
      items: conversions.map((conversion) => this.mapScheduledListItem(conversion, ledgerEntryMap, assigneeMap)),
      total,
      page,
      pageSize,
    };
  }

  private async getActiveAssignees(resourceIds: string[]): Promise<Map<string, AdminRef>> {
    if (resourceIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<Array<{ resource_id: string; assigned_to: string; email: string | null }>>(
      Prisma.sql`
        SELECT a."resource_id"::text AS resource_id, a."assigned_to"::text AS assigned_to, ad."email" AS email
        FROM "operational_assignment" a
        LEFT JOIN "admin" ad ON ad."id" = a."assigned_to"
        WHERE a."resource_type" = 'fx_conversion'
          AND a."released_at" IS NULL
          AND a."resource_id" = ANY(${resourceIds}::uuid[])
      `,
    );
    const result = new Map<string, AdminRef>();
    for (const row of rows) {
      result.set(row.resource_id, { id: row.assigned_to, name: null, email: row.email });
    }
    return result;
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

  async forceExecuteScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for scheduled FX execution`);
    }

    const idempotencyKey = parseUuidOrThrow(meta.idempotencyKey, `Idempotency-Key`);
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    const result = await this.idempotency.execute({
      adminId,
      scope: `exchange-scheduled-force-execute:${conversionId}`,
      key: idempotencyKey,
      payload: {
        conversionId,
        expectedVersion,
        confirmed: true,
      },
      execute: async () => {
        const preflight = await this.prisma.scheduledFxConversionModel.findFirst({
          where: { id: conversionId, deletedAt: null },
        });

        if (!preflight) {
          throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
        }

        if (deriveVersion(preflight.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, preflight.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const locked = await this.lockScheduledRow(tx, conversionId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, locked.updated_at));
          }
          if (!this.isScheduledForceExecutable(locked.status)) {
            if (locked.status === $Enums.ScheduledFxConversionStatus.EXECUTED) {
              throw new ConflictException(adminErrorCodes.ADMIN_CONVERSION_ALREADY_EXECUTED);
            }
            if (locked.status === $Enums.ScheduledFxConversionStatus.CANCELLED) {
              throw new ConflictException(adminErrorCodes.ADMIN_CONVERSION_ALREADY_CANCELLED);
            }
            throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
          }
          if (!(await this.tryActionLock(tx, `exchange_scheduled_force_execute:${conversionId}`))) {
            throw new ConflictException(errorCodes.CONVERSION_ALREADY_PROCESSING);
          }

          const now = new Date();
          const execution = await this.executeScheduledConversion(tx, locked, {
            adminId,
            idempotencyKey,
            now,
          });

          const updated = await tx.scheduledFxConversionModel.update({
            where: { id: locked.id },
            data: {
              status:
                execution.summary.status === `executed`
                  ? $Enums.ScheduledFxConversionStatus.EXECUTED
                  : $Enums.ScheduledFxConversionStatus.FAILED,
              processingAt: now,
              executedAt: execution.summary.status === `executed` ? now : null,
              failedAt: execution.summary.status === `failed` ? now : null,
              attempts: { increment: 1 },
              ledgerId: execution.summary.ledgerId ?? null,
              lastError: execution.summary.status === `failed` ? execution.summary.reason : null,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_scheduled_force_execute,
              resource: `scheduled_fx_conversion`,
              resourceId: locked.id,
              metadata: {
                confirmed: true,
                expectedVersion,
                status: execution.summary.status,
                reason: execution.summary.reason,
                amount: locked.amount.toString(),
                sourceCurrency: locked.from_currency,
                targetCurrency: locked.to_currency,
                ledgerId: execution.summary.ledgerId ?? null,
                idempotencyKey,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            conversionId: locked.id,
            version: deriveVersion(updated.updatedAt),
            ...execution,
          };
        });
      },
    });

    if (result.summary.status === `executed`) {
      await this.domainEvents.publishAfterCommit({
        eventType: `exchange.executed`,
        timestamp: new Date().toISOString(),
        actorId: adminId,
        resourceType: `scheduled_fx_conversion`,
        resourceId: conversionId,
        producerVersion: result.version,
        metadata: {
          status: result.summary.status,
          reason: result.summary.reason,
          ledgerId: result.summary.ledgerId ?? null,
        },
      });
    }

    return result;
  }

  async cancelScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for scheduled FX cancellation`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `exchange-scheduled-cancel:${conversionId}`,
      key: meta.idempotencyKey,
      payload: {
        conversionId,
        expectedVersion,
        confirmed: true,
      },
      execute: async () => {
        const preflight = await this.prisma.scheduledFxConversionModel.findFirst({
          where: { id: conversionId, deletedAt: null },
        });

        if (!preflight) {
          throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
        }

        if (deriveVersion(preflight.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, preflight.updatedAt));
        }

        return this.prisma.$transaction(async (tx) => {
          const locked = await this.lockScheduledRow(tx, conversionId);
          if (!locked || locked.deleted_at) {
            throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
          }
          if (deriveVersion(locked.updated_at) !== expectedVersion) {
            throw new ConflictException(buildStaleVersionPayload(`Scheduled FX conversion`, locked.updated_at));
          }
          if (locked.status !== $Enums.ScheduledFxConversionStatus.PENDING) {
            throw new ConflictException(`Only pending scheduled conversions can be cancelled`);
          }

          const updated = await tx.scheduledFxConversionModel.update({
            where: { id: locked.id },
            data: {
              status: $Enums.ScheduledFxConversionStatus.CANCELLED,
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_scheduled_cancel,
              resource: `scheduled_fx_conversion`,
              resourceId: updated.id,
              metadata: {
                confirmed: true,
                expectedVersion,
                statusBefore: locked.status,
                statusAfter: updated.status,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return {
            conversionId: updated.id,
            status: updated.status,
            version: deriveVersion(updated.updatedAt),
          };
        });
      },
    });
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

  private async publishRuleEvent(adminId: string, ruleId: string, version: number, summary: RuleExecutionSummary) {
    const event: AdminV2DomainEvent = {
      eventType: summary.status === `executed` ? `exchange.executed` : `exchange.failed`,
      timestamp: new Date().toISOString(),
      actorId: adminId,
      resourceType: `exchange_rule`,
      resourceId: ruleId,
      producerVersion: version,
      metadata: {
        reason: summary.reason,
        ledgerId: summary.ledgerId ?? null,
        sourceAmount: summary.sourceAmount ?? null,
        targetAmount: summary.targetAmount ?? null,
      },
    };
    await this.domainEvents.publishAfterCommit(event);
  }

  private async executeRuleConversion(
    tx: Prisma.TransactionClient,
    rule: LockedRuleRow,
    params: { source: string; actorId: string; idempotencyKey: string; now: Date },
  ) {
    const available = await this.lockedBalance(tx, rule.consumer_id, rule.from_currency);
    const targetBalance = Number(rule.target_balance);
    let amountToConvert = available - targetBalance;

    if (available <= targetBalance) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: `balance_below_target`,
          executedAt: params.now,
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }

    if (rule.max_convert_amount != null) {
      amountToConvert = Math.min(amountToConvert, Number(rule.max_convert_amount));
    }

    if (!Number.isFinite(amountToConvert) || amountToConvert <= 0) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: `no_amount_to_convert`,
          executedAt: params.now,
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }

    try {
      const conversion = await this.executeConversionInTransaction(tx, {
        consumerId: rule.consumer_id,
        fromCurrency: rule.from_currency,
        toCurrency: rule.to_currency,
        amount: amountToConvert,
        now: params.now,
        createdBy: adminIdOrConsumer(rule.consumer_id, params.actorId),
        updatedBy: adminIdOrConsumer(rule.consumer_id, params.actorId),
        idempotencyKeyPrefix: params.idempotencyKey,
        metadata: {
          source: params.source,
          ruleId: rule.id,
          initiatedBy: params.actorId,
        },
      });

      return {
        executionState: `executed` as const,
        summary: this.buildExecutionSummary({
          status: `executed`,
          reason: `conversion_executed`,
          executedAt: params.now,
          ledgerId: conversion.ledgerId,
          targetAmount: conversion.targetAmount.toString(),
          sourceAmount: amountToConvert.toFixed(getCurrencyFractionDigits(rule.from_currency)),
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    } catch (error) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: this.mapExecutionFailureReason(error),
          executedAt: params.now,
          source: params.source,
          actorId: params.actorId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }
  }

  private async executeScheduledConversion(
    tx: Prisma.TransactionClient,
    conversion: LockedScheduledRow,
    params: { adminId: string; idempotencyKey: string; now: Date },
  ) {
    try {
      const result = await this.executeConversionInTransaction(tx, {
        consumerId: conversion.consumer_id,
        fromCurrency: conversion.from_currency,
        toCurrency: conversion.to_currency,
        amount: Number(conversion.amount),
        now: params.now,
        createdBy: params.adminId,
        updatedBy: params.adminId,
        idempotencyKeyPrefix: params.idempotencyKey,
        metadata: {
          source: `admin_scheduled_force_execute`,
          initiatedBy: params.adminId,
          scheduledConversionId: conversion.id,
          ruleId: parseOptionalString(asRecord(conversion.metadata).ruleId),
        },
      });

      return {
        executionState: `executed` as const,
        summary: this.buildExecutionSummary({
          status: `executed`,
          reason: `conversion_executed`,
          executedAt: params.now,
          ledgerId: result.ledgerId,
          targetAmount: result.targetAmount.toString(),
          sourceAmount: conversion.amount.toString(),
          source: `admin_scheduled_force_execute`,
          actorId: params.adminId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    } catch (error) {
      return {
        executionState: `failed` as const,
        summary: this.buildExecutionSummary({
          status: `failed`,
          reason: this.mapExecutionFailureReason(error),
          executedAt: params.now,
          source: `admin_scheduled_force_execute`,
          actorId: params.adminId,
          idempotencyKey: params.idempotencyKey,
        }),
      };
    }
  }

  private buildExecutionSummary(params: {
    status: RuleExecutionStatus;
    reason: string;
    executedAt: Date;
    ledgerId?: string | null;
    targetAmount?: string | null;
    sourceAmount?: string | null;
    source: string;
    actorId?: string | null;
    idempotencyKey?: string | null;
  }): RuleExecutionSummary {
    return {
      status: params.status,
      reason: params.reason,
      executedAt: params.executedAt.toISOString(),
      ledgerId: params.ledgerId ?? null,
      targetAmount: params.targetAmount ?? null,
      sourceAmount: params.sourceAmount ?? null,
      source: params.source,
      actorId: params.actorId ?? null,
      idempotencyKey: params.idempotencyKey ?? null,
    };
  }

  private async executeConversionInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      consumerId: string;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      amount: number;
      now: Date;
      createdBy: string;
      updatedBy: string;
      idempotencyKeyPrefix: string;
      metadata: Record<string, unknown>;
    },
  ) {
    if (params.fromCurrency === params.toCurrency) {
      throw new BadRequestException(errorCodes.CANNOT_CONVERT_SAME_CURRENCY);
    }

    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_CONVERT);
    }

    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext((${params.consumerId} || ':exchange')::text)::bigint)
    `);

    const rateRow = await this.findApprovedRateForConversion(tx, params.fromCurrency, params.toCurrency, params.now);
    if (!rateRow) {
      throw new NotFoundException(errorCodes.RATE_NOT_AVAILABLE);
    }

    const referenceAt = getRateReferenceAt(rateRow);
    if (referenceAt.getTime() < this.getRateStaleCutoff(params.now).getTime()) {
      throw new BadRequestException(errorCodes.RATE_STALE);
    }

    const available = await this.balanceService.calculateInTransaction(tx, params.consumerId, params.fromCurrency, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
    if (params.amount > available) {
      throw new BadRequestException(errorCodes.INSUFFICIENT_CURRENCY_BALANCE);
    }

    const rate = Number(rateRow.rate);
    const converted = this.roundToCurrency(params.amount * rate, params.toCurrency);
    const ledgerId = randomUUID();
    const sourceKey = `${params.idempotencyKeyPrefix}:source`;
    const targetKey = `${params.idempotencyKeyPrefix}:target`;
    const metadata = {
      from: params.fromCurrency,
      to: params.toCurrency,
      rate,
      rateId: rateRow.id,
      ...params.metadata,
    };

    await tx.ledgerEntryModel.create({
      data: {
        ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        currencyCode: params.fromCurrency,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -params.amount,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        idempotencyKey: sourceKey,
        metadata,
      },
    });

    const income = await tx.ledgerEntryModel.create({
      data: {
        ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        currencyCode: params.toCurrency,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: converted,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        idempotencyKey: targetKey,
        metadata,
      },
    });

    return {
      ledgerId,
      entryId: income.id,
      targetAmount: converted,
    };
  }

  private mapExecutionFailureReason(error: unknown) {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === `string`) {
        return response;
      }
      if (response && typeof response === `object` && `message` in response) {
        const message = (response as { message?: unknown }).message;
        if (typeof message === `string`) {
          return message;
        }
        if (Array.isArray(message) && typeof message[0] === `string`) {
          return message[0];
        }
      }
      return error.message;
    }
    return error instanceof Error ? error.message : `Unknown error`;
  }

  private async findApprovedRateForConversion(
    tx: Prisma.TransactionClient,
    fromCurrency: $Enums.CurrencyCode,
    toCurrency: $Enums.CurrencyCode,
    now: Date,
  ) {
    return tx.exchangeRateModel.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        status: $Enums.ExchangeRateStatus.APPROVED,
        deletedAt: null,
        effectiveAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ effectiveAt: `desc` }, { createdAt: `desc` }, { id: `desc` }],
    });
  }

  private async lockedBalance(tx: Prisma.TransactionClient, consumerId: string, currency: $Enums.CurrencyCode) {
    return this.balanceService.calculateInTransaction(tx, consumerId, currency, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
  }

  private async tryActionLock(tx: Prisma.TransactionClient, lockKey: string) {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`
      SELECT pg_try_advisory_xact_lock(hashtext(${lockKey}::text)::bigint) AS locked
    `);
    return Boolean(rows[0]?.locked);
  }

  private async lockRuleRow(tx: Prisma.TransactionClient, ruleId: string) {
    const rows = await tx.$queryRaw<LockedRuleRow[]>(Prisma.sql`
      SELECT
        rule."id",
        rule."consumer_id",
        rule."from_currency",
        rule."to_currency",
        rule."target_balance",
        rule."max_convert_amount",
        rule."min_interval_minutes",
        rule."next_run_at",
        rule."last_run_at",
        rule."enabled",
        rule."metadata",
        rule."updated_at",
        rule."deleted_at",
        consumer."email" AS consumer_email
      FROM "wallet_auto_conversion_rule" AS rule
      LEFT JOIN "consumer" AS consumer ON consumer."id" = rule."consumer_id"
      WHERE rule."id" = ${ruleId}
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }

  private async lockScheduledRow(tx: Prisma.TransactionClient, conversionId: string) {
    const rows = await tx.$queryRaw<LockedScheduledRow[]>(Prisma.sql`
      SELECT
        conversion."id",
        conversion."consumer_id",
        conversion."from_currency",
        conversion."to_currency",
        conversion."amount",
        conversion."status",
        conversion."execute_at",
        conversion."processing_at",
        conversion."executed_at",
        conversion."failed_at",
        conversion."attempts",
        conversion."last_error",
        conversion."ledger_id",
        conversion."metadata",
        conversion."updated_at",
        conversion."deleted_at",
        consumer."email" AS consumer_email
      FROM "scheduled_fx_conversion" AS conversion
      LEFT JOIN "consumer" AS consumer ON consumer."id" = conversion."consumer_id"
      WHERE conversion."id" = ${conversionId}
      FOR UPDATE
    `);
    return rows[0] ?? null;
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

  private getRateStaleCutoff(now: Date) {
    return new Date(now.getTime() - this.getMaxRateAgeMs());
  }
}

function adminIdOrConsumer(consumerId: string, adminId: string | null | undefined) {
  return adminId ?? consumerId;
}
