import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { assertValidThresholdPayload } from './admin-v2-operational-alerts-thresholds';
import { type OperationalAlertWorkspace } from './admin-v2-operational-alerts.dto';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type LockedAlertRow = {
  id: string;
  owner_id: string;
  workspace: string;
  name: string;
  deleted_at: Date | null;
};

function isUniqueViolation(error: unknown): boolean {
  if (error == null || typeof error !== `object`) return false;
  const candidate = error as { code?: string };
  return candidate.code === `P2002`;
}

@Injectable()
export class AdminV2OperationalAlertsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async create(params: {
    adminId: string;
    workspace: string;
    name: string;
    description: string | null;
    queryPayload: Prisma.InputJsonValue;
    thresholdPayload: Prisma.InputJsonValue;
    evaluationIntervalMinutes: number;
  }) {
    try {
      return await this.prisma.operationalAlertModel.create({
        data: {
          ownerId: params.adminId,
          workspace: params.workspace,
          name: params.name,
          description: params.description,
          queryPayload: params.queryPayload,
          thresholdPayload: params.thresholdPayload,
          evaluationIntervalMinutes: params.evaluationIntervalMinutes,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Operational alert with this name already exists`);
      }
      throw error;
    }
  }

  async update(params: {
    operationalAlertId: string;
    adminId: string;
    hasName: boolean;
    nextName?: string;
    hasDescription: boolean;
    nextDescription?: string | null;
    hasQueryPayload: boolean;
    queryPayload?: unknown;
    hasThresholdPayload: boolean;
    thresholdPayload?: unknown;
    hasInterval: boolean;
    nextInterval?: number;
    evaluationStateReset: boolean;
  }) {
    return this.transactions.run(async (tx) => {
      const lockedRows = await tx.$queryRaw<LockedAlertRow[]>(Prisma.sql`
        SELECT "id", "owner_id", "workspace", "name", "deleted_at"
        FROM "operational_alert"
        WHERE "id" = ${Prisma.sql`${params.operationalAlertId}::uuid`}
        FOR UPDATE
      `);
      const locked = lockedRows[0];
      if (!locked || locked.owner_id !== params.adminId) {
        throw new NotFoundException(`Operational alert not found`);
      }
      if (locked.deleted_at) {
        throw new ConflictException(`Operational alert is already deleted`);
      }

      if (params.hasThresholdPayload) {
        assertValidThresholdPayload(params.thresholdPayload, locked.workspace as OperationalAlertWorkspace);
      }

      try {
        const updated = await tx.operationalAlertModel.update({
          where: { id: params.operationalAlertId },
          data: {
            ...(params.hasName ? { name: params.nextName! } : {}),
            ...(params.hasDescription ? { description: params.nextDescription ?? null } : {}),
            ...(params.hasQueryPayload ? { queryPayload: params.queryPayload as Prisma.InputJsonValue } : {}),
            ...(params.hasThresholdPayload
              ? { thresholdPayload: params.thresholdPayload as unknown as Prisma.InputJsonValue }
              : {}),
            ...(params.hasInterval ? { evaluationIntervalMinutes: params.nextInterval! } : {}),
            ...(params.evaluationStateReset
              ? {
                  lastEvaluatedAt: null,
                  lastEvaluationError: null,
                  lastFiredAt: null,
                  lastFireReason: null,
                }
              : {}),
          },
        });

        return { previousName: locked.name, updated };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(`Operational alert with this name already exists`);
        }
        throw error;
      }
    });
  }

  async softDelete(params: { operationalAlertId: string; adminId: string }) {
    return this.transactions.run(async (tx) => {
      const lockedRows = await tx.$queryRaw<LockedAlertRow[]>(Prisma.sql`
        SELECT "id", "owner_id", "workspace", "name", "deleted_at"
        FROM "operational_alert"
        WHERE "id" = ${Prisma.sql`${params.operationalAlertId}::uuid`}
        FOR UPDATE
      `);
      const locked = lockedRows[0];
      if (!locked || locked.owner_id !== params.adminId) {
        throw new NotFoundException(`Operational alert not found`);
      }
      if (locked.deleted_at) {
        throw new ConflictException(`Operational alert is already deleted`);
      }
      const updated = await tx.operationalAlertModel.update({
        where: { id: params.operationalAlertId },
        data: { deletedAt: new Date() },
      });
      return { lockedName: locked.name, lockedWorkspace: locked.workspace, updated };
    });
  }
}
