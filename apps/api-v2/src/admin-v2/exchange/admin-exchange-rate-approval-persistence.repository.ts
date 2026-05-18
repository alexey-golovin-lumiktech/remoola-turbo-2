import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { type AdminV2RequestAuditMeta as RequestMeta } from '../admin-v2-context.types';
import { buildStaleVersionPayload, deriveVersion } from '../admin-v2-version-utils';

@Injectable()
export class AdminExchangeRateApprovalPersistenceRepository {
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
}
