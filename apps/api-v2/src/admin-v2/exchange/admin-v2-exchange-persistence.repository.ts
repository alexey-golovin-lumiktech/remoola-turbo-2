import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { ExchangeExecutionState } from './exchange-execution-summary';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type ExchangeExecutionSummary = {
  status: `executed` | `failed`;
  reason: string;
  executedAt: string;
  ledgerId?: string | null;
  targetAmount?: string | null;
  sourceAmount?: string | null;
  idempotencyKey?: string | null;
  source: string;
  actorId?: string | null;
};

export type ExchangeRuleExecutionResult = {
  ruleId: string;
  version: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  executionState: ExchangeExecutionState;
  summary: ExchangeExecutionSummary;
};

export type ExchangeScheduledExecutionResult = {
  conversionId: string;
  version: number;
  executionState: ExchangeExecutionState;
  summary: ExchangeExecutionSummary;
};

type LockedRuleRow = {
  id: string;
  enabled: boolean;
  updated_at: Date;
  deleted_at: Date | null;
};

type LockedScheduledRow = {
  id: string;
  status: $Enums.ScheduledFxConversionStatus;
  updated_at: Date;
  deleted_at: Date | null;
};

export type LockedRuleExecutionRow = {
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
};

export type LockedScheduledExecutionRow = {
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
};

function asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
  return value && typeof value === `object` && !Array.isArray(value) ? { ...value } : {};
}

function mergeMetadata(base: Prisma.JsonValue | null | undefined, patch: Record<string, unknown>) {
  return {
    ...asRecord(base),
    ...patch,
  } as Prisma.InputJsonValue;
}

@Injectable()
export class AdminV2ExchangePersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async acquireConversionAdvisoryLock(tx: Prisma.TransactionClient, consumerId: string) {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext((${consumerId} || ':exchange')::text)::bigint)
    `);
  }

  async findApprovedRateForConversion(
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

  async createConversionLedgerEntries(
    tx: Prisma.TransactionClient,
    params: {
      ledgerId: string;
      consumerId: string;
      fromCurrency: $Enums.CurrencyCode;
      toCurrency: $Enums.CurrencyCode;
      sourceAmount: number;
      targetAmount: number;
      createdBy: string;
      updatedBy: string;
      sourceIdempotencyKey: string;
      targetIdempotencyKey: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        currencyCode: params.fromCurrency,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -params.sourceAmount,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        idempotencyKey: params.sourceIdempotencyKey,
        metadata: params.metadata,
      },
    });

    const creditEntry = await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        currencyCode: params.toCurrency,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: params.targetAmount,
        createdBy: params.createdBy,
        updatedBy: params.updatedBy,
        idempotencyKey: params.targetIdempotencyKey,
        metadata: params.metadata,
      },
    });

    return {
      entryId: creditEntry.id,
    };
  }

  async tryActionLock(tx: Prisma.TransactionClient, lockKey: string) {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`
      SELECT pg_try_advisory_xact_lock(hashtext(${lockKey}::text)::bigint) AS locked
    `);
    return Boolean(rows[0]?.locked);
  }

  async approveDraftRate(
    tx: Prisma.TransactionClient,
    params: {
      rateId: string;
      expectedVersion: number;
      adminId: string;
      reason: string;
      meta: RequestMeta;
    },
  ) {
    const locked = await tx.exchangeRateModel.findFirst({
      where: { id: params.rateId, deletedAt: null },
    });

    if (!locked) {
      throw new NotFoundException(adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND);
    }

    if (deriveVersion(locked.updatedAt) !== params.expectedVersion) {
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
        approvedBy: params.adminId,
        updatedBy: params.adminId,
      },
    });

    await tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rate_approve,
        resource: `exchange_rate`,
        resourceId: updated.id,
        metadata: {
          confirmed: true,
          reason: params.reason,
          expectedVersion: params.expectedVersion,
          fromCurrency: updated.fromCurrency,
          toCurrency: updated.toCurrency,
          provider: updated.provider,
          effectiveAt: updated.effectiveAt.toISOString(),
        },
        ipAddress: params.meta.ipAddress ?? null,
        userAgent: params.meta.userAgent ?? null,
      },
    });

    return {
      rateId: updated.id,
      status: updated.status,
      approvedAt: approvedAt.toISOString(),
      version: deriveVersion(updated.updatedAt),
    };
  }

  async setRuleEnabled(
    tx: Prisma.TransactionClient,
    params: {
      ruleId: string;
      expectedVersion: number;
      adminId: string;
      enabled: boolean;
      meta: RequestMeta;
    },
  ) {
    const locked = await this.lockRuleRow(tx, params.ruleId);
    if (!locked || locked.deleted_at) {
      throw new NotFoundException(adminErrorCodes.ADMIN_RULE_NOT_FOUND);
    }
    if (deriveVersion(locked.updated_at) !== params.expectedVersion) {
      throw new ConflictException(buildStaleVersionPayload(`Exchange rule`, locked.updated_at));
    }
    if (params.enabled && locked.enabled) {
      throw new ConflictException(`Exchange rule is already active`);
    }
    if (!params.enabled && !locked.enabled) {
      throw new ConflictException(`Exchange rule is already paused`);
    }

    const updated = await tx.walletAutoConversionRuleModel.update({
      where: { id: locked.id },
      data: {
        enabled: params.enabled,
      },
    });

    await tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: params.enabled
          ? ADMIN_ACTION_AUDIT_ACTIONS.exchange_rule_resume
          : ADMIN_ACTION_AUDIT_ACTIONS.exchange_rule_pause,
        resource: `exchange_rule`,
        resourceId: updated.id,
        metadata: {
          expectedVersion: params.expectedVersion,
          enabledBefore: locked.enabled,
          enabledAfter: updated.enabled,
        },
        ipAddress: params.meta.ipAddress ?? null,
        userAgent: params.meta.userAgent ?? null,
      },
    });

    return {
      ruleId: updated.id,
      enabled: updated.enabled,
      version: deriveVersion(updated.updatedAt),
    };
  }

  async cancelScheduledConversion(
    tx: Prisma.TransactionClient,
    params: {
      conversionId: string;
      expectedVersion: number;
      adminId: string;
      meta: RequestMeta;
    },
  ) {
    const locked = await this.lockScheduledRow(tx, params.conversionId);
    if (!locked || locked.deleted_at) {
      throw new NotFoundException(adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND);
    }
    if (deriveVersion(locked.updated_at) !== params.expectedVersion) {
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
        adminId: params.adminId,
        action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_scheduled_cancel,
        resource: `scheduled_fx_conversion`,
        resourceId: updated.id,
        metadata: {
          confirmed: true,
          expectedVersion: params.expectedVersion,
          statusBefore: locked.status,
          statusAfter: updated.status,
        },
        ipAddress: params.meta.ipAddress ?? null,
        userAgent: params.meta.userAgent ?? null,
      },
    });

    return {
      conversionId: updated.id,
      status: updated.status,
      version: deriveVersion(updated.updatedAt),
    };
  }

  async finalizeRuleExecution(
    tx: Prisma.TransactionClient,
    params: {
      locked: LockedRuleExecutionRow;
      summary: ExchangeExecutionSummary;
      expectedVersion: number;
      adminId: string;
      idempotencyKey: string;
      meta: RequestMeta;
      now: Date;
    },
  ) {
    const updated = await tx.walletAutoConversionRuleModel.update({
      where: { id: params.locked.id },
      data: {
        lastRunAt: params.now,
        nextRunAt: new Date(params.now.getTime() + params.locked.min_interval_minutes * 60 * 1000),
        metadata: mergeMetadata(params.locked.metadata, {
          lastExecution: params.summary,
        }),
      },
    });

    await tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_rule_run_now,
        resource: `exchange_rule`,
        resourceId: params.locked.id,
        metadata: {
          expectedVersion: params.expectedVersion,
          status: params.summary.status,
          reason: params.summary.reason,
          ledgerId: params.summary.ledgerId ?? null,
          idempotencyKey: params.idempotencyKey,
        },
        ipAddress: params.meta.ipAddress ?? null,
        userAgent: params.meta.userAgent ?? null,
      },
    });

    return {
      ruleId: params.locked.id,
      version: deriveVersion(updated.updatedAt),
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      nextRunAt: updated.nextRunAt?.toISOString() ?? null,
    };
  }

  async finalizeScheduledExecution(
    tx: Prisma.TransactionClient,
    params: {
      locked: LockedScheduledExecutionRow;
      summary: ExchangeExecutionSummary;
      expectedVersion: number;
      adminId: string;
      idempotencyKey: string;
      meta: RequestMeta;
      now: Date;
    },
  ) {
    const updated = await tx.scheduledFxConversionModel.update({
      where: { id: params.locked.id },
      data: {
        status:
          params.summary.status === `executed`
            ? $Enums.ScheduledFxConversionStatus.EXECUTED
            : $Enums.ScheduledFxConversionStatus.FAILED,
        processingAt: params.now,
        executedAt: params.summary.status === `executed` ? params.now : null,
        failedAt: params.summary.status === `failed` ? params.now : null,
        attempts: { increment: 1 },
        ledgerId: params.summary.ledgerId ?? null,
        lastError: params.summary.status === `failed` ? params.summary.reason : null,
      },
    });

    await tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: ADMIN_ACTION_AUDIT_ACTIONS.exchange_scheduled_force_execute,
        resource: `scheduled_fx_conversion`,
        resourceId: params.locked.id,
        metadata: {
          confirmed: true,
          expectedVersion: params.expectedVersion,
          status: params.summary.status,
          reason: params.summary.reason,
          amount: params.locked.amount.toString(),
          sourceCurrency: params.locked.from_currency,
          targetCurrency: params.locked.to_currency,
          ledgerId: params.summary.ledgerId ?? null,
          idempotencyKey: params.idempotencyKey,
        },
        ipAddress: params.meta.ipAddress ?? null,
        userAgent: params.meta.userAgent ?? null,
      },
    });

    return {
      conversionId: params.locked.id,
      version: deriveVersion(updated.updatedAt),
    };
  }

  async lockRuleExecutionRow(tx: Prisma.TransactionClient, ruleId: string) {
    const rows = await tx.$queryRaw<LockedRuleExecutionRow[]>(Prisma.sql`
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
        rule."deleted_at"
      FROM "wallet_auto_conversion_rule" AS rule
      WHERE rule."id" = ${ruleId}
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }

  async lockScheduledExecutionRow(tx: Prisma.TransactionClient, conversionId: string) {
    const rows = await tx.$queryRaw<LockedScheduledExecutionRow[]>(Prisma.sql`
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
        conversion."deleted_at"
      FROM "scheduled_fx_conversion" AS conversion
      WHERE conversion."id" = ${conversionId}
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }

  private async lockRuleRow(tx: Prisma.TransactionClient, ruleId: string) {
    const rows = await tx.$queryRaw<LockedRuleRow[]>(Prisma.sql`
      SELECT
        rule."id",
        rule."enabled",
        rule."updated_at",
        rule."deleted_at"
      FROM "wallet_auto_conversion_rule" AS rule
      WHERE rule."id" = ${ruleId}
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }

  private async lockScheduledRow(tx: Prisma.TransactionClient, conversionId: string) {
    const rows = await tx.$queryRaw<LockedScheduledRow[]>(Prisma.sql`
      SELECT
        conversion."id",
        conversion."status",
        conversion."updated_at",
        conversion."deleted_at"
      FROM "scheduled_fx_conversion" AS conversion
      WHERE conversion."id" = ${conversionId}
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }
}
