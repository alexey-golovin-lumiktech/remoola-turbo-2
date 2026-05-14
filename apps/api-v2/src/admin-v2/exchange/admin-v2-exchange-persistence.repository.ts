import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
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

@Injectable()
export class AdminV2ExchangePersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

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
