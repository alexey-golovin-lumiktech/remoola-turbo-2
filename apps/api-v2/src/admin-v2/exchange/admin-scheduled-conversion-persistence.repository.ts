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

type ExchangeExecutionSummary = {
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

export type ExchangeScheduledExecutionResult = {
  conversionId: string;
  version: number;
  executionState: ExchangeExecutionState;
  summary: ExchangeExecutionSummary;
};

type LockedScheduledRow = {
  id: string;
  status: $Enums.ScheduledFxConversionStatus;
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

@Injectable()
export class AdminScheduledConversionPersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

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
