import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2OperationalAlertSummary, type AdminV2OperationalAlertsListResponse } from '@remoola/api-types';
import { Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  OperationalAlertThreshold,
  assertValidThresholdPayload,
  getThresholdPayloadBytes,
} from './admin-v2-operational-alerts-thresholds';
import {
  DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH,
  MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  MAX_OPERATIONAL_ALERT_NAME_LENGTH,
  MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  MIN_OPERATIONAL_ALERT_NAME_LENGTH,
  OperationalAlertWorkspace,
  assertOperationalAlertWorkspace,
  assertValidQueryPayload,
} from './admin-v2-operational-alerts.dto';

type OperationalAlertRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type OperationalAlertActorContext = {
  id: string;
  email?: string;
  type: string;
};

type OperationalAlertSummary = AdminV2OperationalAlertSummary;

const OPERATIONAL_ALERT_LIST_HARD_CAP = 200;

type OperationalAlertRow = {
  id: string;
  ownerId: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: Prisma.JsonValue;
  thresholdPayload: Prisma.JsonValue;
  evaluationIntervalMinutes: number;
  lastEvaluatedAt: Date | null;
  lastEvaluationError: string | null;
  lastFiredAt: Date | null;
  lastFireReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function toSummary(row: OperationalAlertRow): OperationalAlertSummary {
  return {
    id: row.id,
    workspace: row.workspace as OperationalAlertWorkspace,
    name: row.name,
    description: row.description,
    queryPayload: row.queryPayload as unknown,
    thresholdPayload: row.thresholdPayload as unknown as OperationalAlertThreshold,
    evaluationIntervalMinutes: row.evaluationIntervalMinutes,
    lastEvaluatedAt: row.lastEvaluatedAt ? row.lastEvaluatedAt.toISOString() : null,
    lastEvaluationError: row.lastEvaluationError,
    lastFiredAt: row.lastFiredAt ? row.lastFiredAt.toISOString() : null,
    lastFireReason: row.lastFireReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function trimRequiredName(raw: string | null | undefined): string {
  const trimmed = (raw ?? ``).trim();
  if (trimmed.length < MIN_OPERATIONAL_ALERT_NAME_LENGTH) {
    throw new BadRequestException(`name is required`);
  }
  if (trimmed.length > MAX_OPERATIONAL_ALERT_NAME_LENGTH) {
    throw new BadRequestException(`name is too long (max ${MAX_OPERATIONAL_ALERT_NAME_LENGTH} characters)`);
  }
  return trimmed;
}

function normalizeDescription(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH) {
    throw new BadRequestException(
      `description is too long (max ${MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH} characters)`,
    );
  }
  return trimmed;
}

function normalizeEvaluationInterval(raw: number | null | undefined): number {
  if (raw === undefined || raw === null) {
    return DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES;
  }
  if (typeof raw !== `number` || !Number.isInteger(raw)) {
    throw new BadRequestException(`evaluationIntervalMinutes must be an integer`);
  }
  if (raw < MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES || raw > MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES) {
    const min = MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES;
    const max = MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES;
    throw new BadRequestException(`evaluationIntervalMinutes must be between ${min} and ${max}`);
  }
  return raw;
}

function assertExpectedDeletedAtNull(value: number) {
  if (value !== 0) {
    throw new BadRequestException(`expectedDeletedAtNull must be 0`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error == null || typeof error !== `object`) return false;
  const candidate = error as { code?: string };
  return candidate.code === `P2002`;
}

@Injectable()
export class AdminV2OperationalAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  async list(actor: OperationalAlertActorContext, workspace: string): Promise<AdminV2OperationalAlertsListResponse> {
    assertOperationalAlertWorkspace(workspace);
    const rows = await this.prisma.operationalAlertModel.findMany({
      where: {
        ownerId: actor.id,
        workspace,
        deletedAt: null,
      },
      orderBy: { name: `asc` },
      take: OPERATIONAL_ALERT_LIST_HARD_CAP,
    });
    return { alerts: rows.map((row) => toSummary(row as OperationalAlertRow)) };
  }

  async create(
    actor: OperationalAlertActorContext,
    body: {
      workspace?: string;
      name?: string;
      description?: string | null;
      queryPayload?: unknown;
      thresholdPayload?: unknown;
      evaluationIntervalMinutes?: number | null;
    },
    meta: OperationalAlertRequestMeta,
  ): Promise<OperationalAlertSummary> {
    if (!body.workspace || typeof body.workspace !== `string`) {
      throw new BadRequestException(`workspace is required`);
    }
    assertOperationalAlertWorkspace(body.workspace);
    const workspace: OperationalAlertWorkspace = body.workspace;
    const name = trimRequiredName(body.name);
    const description = normalizeDescription(body.description);
    assertValidQueryPayload(body.queryPayload);
    assertValidThresholdPayload(body.thresholdPayload, workspace);
    const evaluationIntervalMinutes = normalizeEvaluationInterval(body.evaluationIntervalMinutes);
    const queryPayload = body.queryPayload as Prisma.InputJsonValue;
    const thresholdPayload = body.thresholdPayload as unknown as Prisma.InputJsonValue;
    const adminId = actor.id;
    const queryPayloadBytes = Buffer.byteLength(JSON.stringify(body.queryPayload), `utf8`);
    const thresholdPayloadBytes = getThresholdPayloadBytes(body.thresholdPayload);
    const thresholdType = (body.thresholdPayload as { type: string }).type;

    return this.idempotency.execute({
      adminId,
      scope: `operational-alert-create`,
      key: meta.idempotencyKey,
      payload: { workspace, name, description, queryPayload, thresholdPayload, evaluationIntervalMinutes },
      execute: async () => {
        let created;
        try {
          created = await this.prisma.operationalAlertModel.create({
            data: {
              ownerId: adminId,
              workspace,
              name,
              description,
              queryPayload,
              thresholdPayload,
              evaluationIntervalMinutes,
            },
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(`Operational alert with this name already exists`);
          }
          throw error;
        }

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.alert_create,
          resource: `operational_alert`,
          resourceId: created.id,
          metadata: {
            workspace,
            name,
            evaluationIntervalMinutes,
            queryPayloadBytes,
            thresholdPayloadBytes,
            thresholdType,
            severity: `standard`,
          },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return toSummary(created as OperationalAlertRow);
      },
    });
  }

  async update(
    actor: OperationalAlertActorContext,
    operationalAlertId: string,
    body: {
      name?: string;
      description?: string | null;
      queryPayload?: unknown;
      thresholdPayload?: unknown;
      evaluationIntervalMinutes?: number | null;
      expectedDeletedAtNull?: number;
    },
    meta: OperationalAlertRequestMeta,
  ): Promise<OperationalAlertSummary> {
    assertExpectedDeletedAtNull(Number(body.expectedDeletedAtNull));
    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    const hasQueryPayload = body.queryPayload !== undefined;
    const hasThresholdPayload = body.thresholdPayload !== undefined;
    const hasInterval = body.evaluationIntervalMinutes !== undefined;
    if (!hasName && !hasDescription && !hasQueryPayload && !hasThresholdPayload && !hasInterval) {
      throw new BadRequestException(`No fields to update`);
    }

    const nextName = hasName ? trimRequiredName(body.name) : undefined;
    const nextDescription = hasDescription ? normalizeDescription(body.description) : undefined;
    if (hasQueryPayload) {
      assertValidQueryPayload(body.queryPayload);
    }
    const nextQueryPayloadBytes = hasQueryPayload ? Buffer.byteLength(JSON.stringify(body.queryPayload), `utf8`) : null;
    const nextInterval = hasInterval ? normalizeEvaluationInterval(body.evaluationIntervalMinutes) : undefined;
    const adminId = actor.id;
    // We cannot validate threshold payload until we know the workspace (loaded under FOR UPDATE);
    // workspace is immutable so it is the loaded row's workspace. Validation happens inside the txn.
    const evaluationStateReset = hasQueryPayload || hasThresholdPayload || hasInterval;

    return this.idempotency.execute({
      adminId,
      scope: `operational-alert-update`,
      key: meta.idempotencyKey,
      payload: {
        operationalAlertId,
        name: hasName ? nextName : undefined,
        description: hasDescription ? (nextDescription ?? null) : undefined,
        queryPayload: hasQueryPayload ? body.queryPayload : undefined,
        thresholdPayload: hasThresholdPayload ? body.thresholdPayload : undefined,
        evaluationIntervalMinutes: hasInterval ? nextInterval : undefined,
        expectedDeletedAtNull: 0,
      },
      execute: async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          const lockedRows = await tx.$queryRaw<
            Array<{
              id: string;
              owner_id: string;
              workspace: string;
              name: string;
              deleted_at: Date | null;
            }>
          >(Prisma.sql`
            SELECT "id", "owner_id", "workspace", "name", "deleted_at"
            FROM "operational_alert"
            WHERE "id" = ${Prisma.sql`${operationalAlertId}::uuid`}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked || locked.owner_id !== adminId) {
            throw new NotFoundException(`Operational alert not found`);
          }
          if (locked.deleted_at) {
            throw new ConflictException(`Operational alert is already deleted`);
          }

          if (hasThresholdPayload) {
            assertValidThresholdPayload(body.thresholdPayload, locked.workspace as OperationalAlertWorkspace);
          }

          let updated;
          try {
            updated = await tx.operationalAlertModel.update({
              where: { id: operationalAlertId },
              data: {
                ...(hasName ? { name: nextName! } : {}),
                ...(hasDescription ? { description: nextDescription ?? null } : {}),
                ...(hasQueryPayload ? { queryPayload: body.queryPayload as Prisma.InputJsonValue } : {}),
                ...(hasThresholdPayload
                  ? { thresholdPayload: body.thresholdPayload as unknown as Prisma.InputJsonValue }
                  : {}),
                ...(hasInterval ? { evaluationIntervalMinutes: nextInterval! } : {}),
                ...(evaluationStateReset
                  ? {
                      lastEvaluatedAt: null,
                      lastEvaluationError: null,
                      lastFiredAt: null,
                      lastFireReason: null,
                    }
                  : {}),
              },
            });
          } catch (error) {
            if (isUniqueViolation(error)) {
              throw new ConflictException(`Operational alert with this name already exists`);
            }
            throw error;
          }

          return { previousName: locked.name, updated };
        });

        const changedFields = [
          ...(hasName ? [`name`] : []),
          ...(hasDescription ? [`description`] : []),
          ...(hasQueryPayload ? [`queryPayload`] : []),
          ...(hasThresholdPayload ? [`thresholdPayload`] : []),
          ...(hasInterval ? [`evaluationIntervalMinutes`] : []),
        ];
        const nextThresholdBytes = hasThresholdPayload ? getThresholdPayloadBytes(body.thresholdPayload) : null;
        const nextThresholdType = hasThresholdPayload ? (body.thresholdPayload as { type: string }).type : null;

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.alert_update,
          resource: `operational_alert`,
          resourceId: operationalAlertId,
          metadata: {
            workspace: result.updated.workspace,
            changedFields,
            evaluationStateReset,
            ...(hasName && nextName !== result.previousName ? { previousName: result.previousName } : {}),
            ...(nextQueryPayloadBytes !== null ? { queryPayloadBytes: nextQueryPayloadBytes } : {}),
            ...(nextThresholdBytes !== null ? { thresholdPayloadBytes: nextThresholdBytes } : {}),
            ...(nextThresholdType !== null ? { thresholdType: nextThresholdType } : {}),
            ...(hasInterval ? { evaluationIntervalMinutes: nextInterval } : {}),
            severity: `standard`,
          },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return toSummary(result.updated as OperationalAlertRow);
      },
    });
  }

  async delete(
    actor: OperationalAlertActorContext,
    operationalAlertId: string,
    body: { expectedDeletedAtNull?: number },
    meta: OperationalAlertRequestMeta,
  ): Promise<{ operationalAlertId: string; deletedAt: string }> {
    assertExpectedDeletedAtNull(Number(body.expectedDeletedAtNull));
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `operational-alert-delete`,
      key: meta.idempotencyKey,
      payload: { operationalAlertId, expectedDeletedAtNull: 0 },
      execute: async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          const lockedRows = await tx.$queryRaw<
            Array<{
              id: string;
              owner_id: string;
              workspace: string;
              name: string;
              deleted_at: Date | null;
            }>
          >(Prisma.sql`
            SELECT "id", "owner_id", "workspace", "name", "deleted_at"
            FROM "operational_alert"
            WHERE "id" = ${Prisma.sql`${operationalAlertId}::uuid`}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked || locked.owner_id !== adminId) {
            throw new NotFoundException(`Operational alert not found`);
          }
          if (locked.deleted_at) {
            throw new ConflictException(`Operational alert is already deleted`);
          }
          const updated = await tx.operationalAlertModel.update({
            where: { id: operationalAlertId },
            data: { deletedAt: new Date() },
          });
          return { lockedName: locked.name, lockedWorkspace: locked.workspace, updated };
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.alert_delete,
          resource: `operational_alert`,
          resourceId: operationalAlertId,
          metadata: {
            workspace: result.lockedWorkspace,
            name: result.lockedName,
            severity: `standard`,
          },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return {
          operationalAlertId,
          deletedAt: result.updated.deletedAt!.toISOString(),
        };
      },
    });
  }
}
