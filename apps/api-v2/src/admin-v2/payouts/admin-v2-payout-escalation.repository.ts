import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AdminV2PayoutEscalationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLatestOutcome(tx: Prisma.TransactionClient, ledgerEntryId: string) {
    return tx.ledgerEntryOutcomeModel.findFirst({
      where: {
        ledgerEntryId,
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: {
        status: true,
        createdAt: true,
        externalId: true,
      },
    });
  }

  findExistingEscalation(tx: Prisma.TransactionClient, ledgerEntryId: string) {
    return tx.payoutEscalationModel.findUnique({
      where: {
        ledgerEntryId,
      },
      select: {
        id: true,
        createdAt: true,
        reason: true,
      },
    });
  }

  async createEscalationWithAudit(
    tx: Prisma.TransactionClient,
    params: {
      payoutId: string;
      adminId: string;
      reason: string | null;
      expectedVersion: number;
      derivedStatus: string;
      effectiveStatus: string;
      persistedStatus: string;
      payoutType: string;
      paymentRequestId: string | null;
      meta: RequestMeta;
    },
  ) {
    const escalation = await tx.payoutEscalationModel.create({
      data: {
        ledgerEntryId: params.payoutId,
        escalatedBy: params.adminId,
        reason: params.reason,
        confirmed: true,
      },
      select: {
        id: true,
        createdAt: true,
        reason: true,
      },
    });

    await tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: ADMIN_ACTION_AUDIT_ACTIONS.payout_escalate,
        resource: `payout`,
        resourceId: params.payoutId,
        metadata: {
          confirmed: true,
          reason: params.reason,
          derivedStatus: params.derivedStatus,
          effectiveStatus: params.effectiveStatus,
          persistedStatus: params.persistedStatus,
          expectedVersion: params.expectedVersion,
          escalationId: escalation.id,
          payoutType: params.payoutType,
          paymentRequestId: params.paymentRequestId,
        },
        ipAddress: params.meta.ipAddress ?? null,
        userAgent: params.meta.userAgent ?? null,
      },
    });

    return escalation;
  }
}
