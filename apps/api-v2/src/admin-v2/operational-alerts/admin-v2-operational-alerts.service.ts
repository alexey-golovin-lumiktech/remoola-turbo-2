import { Injectable } from '@nestjs/common';

import { type AdminV2OperationalAlertsListResponse } from '@remoola/api-types';
import { Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  assertExpectedDeletedAtNull,
  assertHasUpdateFields,
  assertRequiredWorkspace,
  buildCreateAuditMetadata,
  buildDeleteAuditMetadata,
  buildUpdateAuditMetadata,
  normalizeDescription,
  normalizeEvaluationInterval,
  shouldResetEvaluationState,
  toSummary,
  trimRequiredName,
  type OperationalAlertRow,
  type OperationalAlertSummary,
} from './admin-v2-operational-alerts-policy';
import { assertValidThresholdPayload, getThresholdPayloadBytes } from './admin-v2-operational-alerts-thresholds';
import { assertValidQueryPayload } from './admin-v2-operational-alerts.dto';
import { AdminV2OperationalAlertsQuery } from './admin-v2-operational-alerts.query';
import { AdminV2OperationalAlertsRepository } from './admin-v2-operational-alerts.repository';
import {
  type AdminV2ActorContext as OperationalAlertActorContext,
  type AdminV2RequestMeta as OperationalAlertRequestMeta,
} from '../admin-v2-context.types';

const OPERATIONAL_ALERT_LIST_HARD_CAP = 200;

@Injectable()
export class AdminV2OperationalAlertsService {
  constructor(
    private readonly query: AdminV2OperationalAlertsQuery,
    private readonly repository: AdminV2OperationalAlertsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  async list(actor: OperationalAlertActorContext, workspace: string): Promise<AdminV2OperationalAlertsListResponse> {
    const normalizedWorkspace = assertRequiredWorkspace(workspace);
    const rows = await this.query.listOwnedActiveAlerts({
      ownerId: actor.id,
      workspace: normalizedWorkspace,
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
    const workspace = assertRequiredWorkspace(body.workspace);
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
        const created = await this.repository.create({
          adminId,
          workspace,
          name,
          description,
          queryPayload,
          thresholdPayload,
          evaluationIntervalMinutes,
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.alert_create,
          resource: `operational_alert`,
          resourceId: created.id,
          metadata: buildCreateAuditMetadata({
            workspace,
            name,
            evaluationIntervalMinutes,
            queryPayloadBytes,
            thresholdPayloadBytes,
            thresholdType,
          }),
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
      expectedDeletedAtNull: number;
    },
    meta: OperationalAlertRequestMeta,
  ): Promise<OperationalAlertSummary> {
    assertExpectedDeletedAtNull(body.expectedDeletedAtNull);
    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    const hasQueryPayload = body.queryPayload !== undefined;
    const hasThresholdPayload = body.thresholdPayload !== undefined;
    const hasInterval = body.evaluationIntervalMinutes !== undefined;
    assertHasUpdateFields({ hasName, hasDescription, hasQueryPayload, hasThresholdPayload, hasInterval });

    const nextName = hasName ? trimRequiredName(body.name) : undefined;
    const nextDescription = hasDescription ? normalizeDescription(body.description) : undefined;
    if (hasQueryPayload) {
      assertValidQueryPayload(body.queryPayload);
    }
    const nextQueryPayloadBytes = hasQueryPayload ? Buffer.byteLength(JSON.stringify(body.queryPayload), `utf8`) : null;
    const nextInterval = hasInterval ? normalizeEvaluationInterval(body.evaluationIntervalMinutes) : undefined;
    const adminId = actor.id;
    const evaluationStateReset = shouldResetEvaluationState({ hasQueryPayload, hasThresholdPayload, hasInterval });

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
        const result = await this.repository.update({
          operationalAlertId,
          adminId,
          hasName,
          nextName,
          hasDescription,
          nextDescription,
          hasQueryPayload,
          queryPayload: body.queryPayload,
          hasThresholdPayload,
          thresholdPayload: body.thresholdPayload,
          hasInterval,
          nextInterval,
          evaluationStateReset,
        });

        const nextThresholdBytes = hasThresholdPayload ? getThresholdPayloadBytes(body.thresholdPayload) : null;
        const nextThresholdType = hasThresholdPayload ? (body.thresholdPayload as { type: string }).type : null;

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.alert_update,
          resource: `operational_alert`,
          resourceId: operationalAlertId,
          metadata: buildUpdateAuditMetadata({
            workspace: result.updated.workspace,
            hasName,
            hasDescription,
            hasQueryPayload,
            hasThresholdPayload,
            hasInterval,
            previousName: result.previousName,
            nextName,
            queryPayloadBytes: nextQueryPayloadBytes,
            thresholdPayloadBytes: nextThresholdBytes,
            thresholdType: nextThresholdType,
            evaluationIntervalMinutes: nextInterval,
          }),
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
    body: { expectedDeletedAtNull: number },
    meta: OperationalAlertRequestMeta,
  ): Promise<{ operationalAlertId: string; deletedAt: string }> {
    assertExpectedDeletedAtNull(body.expectedDeletedAtNull);
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `operational-alert-delete`,
      key: meta.idempotencyKey,
      payload: { operationalAlertId, expectedDeletedAtNull: 0 },
      execute: async () => {
        const result = await this.repository.softDelete({ operationalAlertId, adminId });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.alert_delete,
          resource: `operational_alert`,
          resourceId: operationalAlertId,
          metadata: buildDeleteAuditMetadata({
            workspace: result.lockedWorkspace,
            name: result.lockedName,
          }),
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
