import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { type AdminV2RequestAuditMeta as RequestMeta } from '../admin-v2-context.types';

type LockedPayoutRow = {
  id: string;
  type: $Enums.LedgerEntryType;
  status: $Enums.TransactionStatus;
  consumer_id: string;
  payment_request_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

@Injectable()
export class AdminV2PayoutEscalationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEscalationPreflight(payoutId: string) {
    return this.prisma.ledgerEntryModel.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async lockPayoutForEscalation(tx: Prisma.TransactionClient, payoutId: string): Promise<LockedPayoutRow | null> {
    const lockedRows = await tx.$queryRaw<LockedPayoutRow[]>(Prisma.sql`
      SELECT
        "id",
        "type",
        "status",
        "consumer_id",
        "payment_request_id",
        "created_at",
        "updated_at",
        "deleted_at"
      FROM "ledger_entry"
      WHERE "id" = ${payoutId}
      FOR UPDATE
    `);

    return lockedRows[0] ?? null;
  }

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
