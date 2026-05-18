import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { buildStaleVersionPayload, deriveStatus, deriveVersion } from './admin-v2-payment-methods-mappers';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';
import { type AdminV2RequestMeta } from '../admin-v2-context.types';

export type AdminV2PaymentMethodsRequestMeta = AdminV2RequestMeta;

type AdminV2PaymentMethodMutationRecord = {
  id: string;
  consumerId: string;
  defaultSelected: boolean;
  disabledAt: Date | null;
  deletedAt: Date | null;
  updatedAt: Date;
  stripeFingerprint?: string | null;
};

type LockedPaymentMethodRow = {
  id: string;
  consumer_id: string;
  stripe_fingerprint: string | null;
  deleted_at: Date | null;
  disabled_at: Date | null;
  updated_at: Date;
};

async function lockPaymentMethodForMutation(
  tx: Pick<Prisma.TransactionClient, `$queryRaw`>,
  id: string,
): Promise<LockedPaymentMethodRow | null> {
  const rows = await tx.$queryRaw<LockedPaymentMethodRow[]>(Prisma.sql`
    SELECT
      "id",
      "consumer_id",
      "stripe_fingerprint",
      "deleted_at",
      "disabled_at",
      "updated_at"
    FROM "payment_method"
    WHERE "id" = ${id}
    FOR UPDATE
  `);
  return rows[0] ?? null;
}

const mutationSelect = Prisma.validator<Prisma.PaymentMethodModelSelect>()({
  id: true,
  consumerId: true,
  defaultSelected: true,
  disabledAt: true,
  deletedAt: true,
  updatedAt: true,
  stripeFingerprint: true,
});

@Injectable()
export class AdminV2PaymentMethodsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  getPaymentMethodForMutation(id: string) {
    return this.prisma.paymentMethodModel.findUnique({
      where: { id },
      select: mutationSelect,
    });
  }

  async listFingerprintDuplicateIds(fingerprint: string, paymentMethodId: string) {
    const duplicates = await this.prisma.paymentMethodModel.findMany({
      where: {
        stripeFingerprint: fingerprint,
        id: { not: paymentMethodId },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: {
        id: true,
      },
    });

    return duplicates.map((item) => item.id);
  }

  disablePaymentMethod(params: {
    paymentMethod: AdminV2PaymentMethodMutationRecord;
    adminId: string;
    reason: string;
    meta?: AdminV2PaymentMethodsRequestMeta;
  }) {
    const { paymentMethod, adminId, reason, meta } = params;
    const disabledAt = new Date();

    return this.transactions.run(async (tx) => {
      const updated = await tx.paymentMethodModel.updateMany({
        where: {
          id: paymentMethod.id,
          updatedAt: paymentMethod.updatedAt,
          disabledAt: null,
          deletedAt: null,
        },
        data: {
          disabledAt,
          disabledBy: adminId,
          defaultSelected: false,
        },
      });

      if (updated.count === 0) {
        const current = await tx.paymentMethodModel.findUnique({
          where: { id: paymentMethod.id },
          select: { updatedAt: true },
        });
        throw new ConflictException(
          current ? buildStaleVersionPayload(current.updatedAt) : `Payment method has changed`,
        );
      }

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.payment_method_disable,
          resource: `payment_method`,
          resourceId: paymentMethod.id,
          metadata: {
            previousStatus: `ACTIVE`,
            nextStatus: `DISABLED`,
            reason,
            confirmed: true,
            previousDefaultSelected: paymentMethod.defaultSelected,
            defaultCleared: paymentMethod.defaultSelected,
          },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      const fresh = await tx.paymentMethodModel.findUniqueOrThrow({
        where: { id: paymentMethod.id },
        select: {
          id: true,
          consumerId: true,
          defaultSelected: true,
          disabledAt: true,
          updatedAt: true,
        },
      });

      return {
        paymentMethodId: fresh.id,
        consumerId: fresh.consumerId,
        status: `DISABLED`,
        defaultSelected: fresh.defaultSelected,
        disabledAt: fresh.disabledAt?.toISOString() ?? disabledAt.toISOString(),
        version: deriveVersion(fresh.updatedAt),
        alreadyDisabled: false,
        defaultCleared: paymentMethod.defaultSelected,
      };
    });
  }

  removeDefaultPaymentMethod(params: {
    paymentMethod: AdminV2PaymentMethodMutationRecord;
    adminId: string;
    meta?: AdminV2PaymentMethodsRequestMeta;
  }) {
    const { paymentMethod, adminId, meta } = params;

    return this.transactions.run(async (tx) => {
      const updated = await tx.paymentMethodModel.updateMany({
        where: {
          id: paymentMethod.id,
          updatedAt: paymentMethod.updatedAt,
          deletedAt: null,
          defaultSelected: true,
        },
        data: {
          defaultSelected: false,
        },
      });

      if (updated.count === 0) {
        const current = await tx.paymentMethodModel.findUnique({
          where: { id: paymentMethod.id },
          select: { updatedAt: true },
        });
        throw new ConflictException(
          current ? buildStaleVersionPayload(current.updatedAt) : `Payment method has changed`,
        );
      }

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.payment_method_remove_default,
          resource: `payment_method`,
          resourceId: paymentMethod.id,
          metadata: {
            previousDefaultSelected: true,
            nextDefaultSelected: false,
            statusAtMutation: deriveStatus(paymentMethod),
          },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      const fresh = await tx.paymentMethodModel.findUniqueOrThrow({
        where: { id: paymentMethod.id },
        select: {
          id: true,
          consumerId: true,
          defaultSelected: true,
          disabledAt: true,
          updatedAt: true,
        },
      });

      return {
        paymentMethodId: fresh.id,
        consumerId: fresh.consumerId,
        defaultSelected: fresh.defaultSelected,
        status: deriveStatus(fresh),
        version: deriveVersion(fresh.updatedAt),
        alreadyNotDefault: false,
      };
    });
  }

  escalateDuplicatePaymentMethod(params: {
    paymentMethod: Required<Pick<AdminV2PaymentMethodMutationRecord, `id` | `consumerId`>> &
      Pick<AdminV2PaymentMethodMutationRecord, `updatedAt`>;
    fingerprint: string;
    duplicatePaymentMethodIds: string[];
    expectedVersion: number;
    adminId: string;
    meta?: AdminV2PaymentMethodsRequestMeta;
  }) {
    const { paymentMethod, fingerprint, duplicatePaymentMethodIds, expectedVersion, adminId, meta } = params;

    return this.transactions.run(async (tx) => {
      const lockedPaymentMethod = await lockPaymentMethodForMutation(tx, paymentMethod.id);
      if (!lockedPaymentMethod) {
        throw new NotFoundException(`Payment method not found`);
      }
      if (deriveVersion(lockedPaymentMethod.updated_at) !== expectedVersion) {
        throw new ConflictException(buildStaleVersionPayload(lockedPaymentMethod.updated_at));
      }
      if (lockedPaymentMethod.deleted_at) {
        throw new ConflictException(`Soft-deleted payment method cannot escalate duplicate review`);
      }

      const existing = await tx.paymentMethodDuplicateEscalationModel.findUnique({
        where: {
          paymentMethodId_fingerprint: {
            paymentMethodId: paymentMethod.id,
            fingerprint,
          },
        },
        select: {
          id: true,
          createdAt: true,
          duplicateCount: true,
          duplicatePaymentMethodIds: true,
        },
      });

      if (existing) {
        return {
          paymentMethodId: paymentMethod.id,
          consumerId: paymentMethod.consumerId,
          escalationId: existing.id,
          fingerprint,
          duplicateCount: existing.duplicateCount,
          duplicatePaymentMethodIds: existing.duplicatePaymentMethodIds,
          createdAt: existing.createdAt.toISOString(),
          alreadyEscalated: true,
        };
      }

      const escalation = await tx.paymentMethodDuplicateEscalationModel.create({
        data: {
          paymentMethodId: paymentMethod.id,
          fingerprint,
          duplicateCount: duplicatePaymentMethodIds.length + 1,
          duplicatePaymentMethodIds,
          escalatedBy: adminId,
        },
        select: {
          id: true,
          createdAt: true,
          duplicateCount: true,
          duplicatePaymentMethodIds: true,
        },
      });

      await tx.adminActionAuditLogModel.create({
        data: {
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.payment_method_duplicate_escalate,
          resource: `payment_method`,
          resourceId: paymentMethod.id,
          metadata: {
            fingerprint,
            duplicateCount: escalation.duplicateCount,
            duplicatePaymentMethodIds,
            currentStatus: deriveStatus({ disabledAt: lockedPaymentMethod.disabled_at }),
            softDeleted: false,
          },
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return {
        paymentMethodId: paymentMethod.id,
        consumerId: paymentMethod.consumerId,
        escalationId: escalation.id,
        fingerprint,
        duplicateCount: escalation.duplicateCount,
        duplicatePaymentMethodIds: escalation.duplicatePaymentMethodIds,
        createdAt: escalation.createdAt.toISOString(),
        alreadyEscalated: false,
      };
    });
  }
}
