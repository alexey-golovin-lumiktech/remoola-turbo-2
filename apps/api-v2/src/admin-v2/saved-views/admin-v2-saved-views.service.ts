import { BadRequestException, Injectable } from '@nestjs/common';

import { type AdminV2SavedViewsListResponse } from '@remoola/api-types';
import { Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  type SavedViewRow,
  type SavedViewSummary,
  assertExpectedDeletedAtNull,
  buildCreateAuditMetadata,
  buildDeleteAuditMetadata,
  buildUpdateAuditMetadata,
  normalizeDescription,
  toSummary,
  trimRequiredName,
} from './admin-v2-saved-views-policy';
import { SavedViewWorkspace, assertSavedViewWorkspace, assertValidPayload } from './admin-v2-saved-views.dto';
import { AdminV2SavedViewsQuery } from './admin-v2-saved-views.query';
import { AdminV2SavedViewsRepository } from './admin-v2-saved-views.repository';
import {
  type AdminV2ActorContext as SavedViewActorContext,
  type AdminV2RequestMeta as SavedViewRequestMeta,
} from '../admin-v2-context.types';

const SAVED_VIEW_LIST_HARD_CAP = 200;

@Injectable()
export class AdminV2SavedViewsService {
  constructor(
    private readonly query: AdminV2SavedViewsQuery,
    private readonly repository: AdminV2SavedViewsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  async list(actor: SavedViewActorContext, workspace: string): Promise<AdminV2SavedViewsListResponse> {
    assertSavedViewWorkspace(workspace);
    const rows = await this.query.listOwnedActiveViews({
      ownerId: actor.id,
      workspace,
      take: SAVED_VIEW_LIST_HARD_CAP,
    });
    return { views: rows.map((row) => toSummary(row as SavedViewRow)) };
  }

  async create(
    actor: SavedViewActorContext,
    body: { workspace?: string; name?: string; description?: string | null; queryPayload?: unknown },
    meta: SavedViewRequestMeta,
  ): Promise<SavedViewSummary> {
    if (!body.workspace || typeof body.workspace !== `string`) {
      throw new BadRequestException(`workspace is required`);
    }
    assertSavedViewWorkspace(body.workspace);
    const workspace: SavedViewWorkspace = body.workspace;
    const name = trimRequiredName(body.name);
    const description = normalizeDescription(body.description);
    assertValidPayload(body.queryPayload);
    const queryPayload = body.queryPayload as Prisma.InputJsonValue;
    const adminId = actor.id;
    const payloadBytes = Buffer.byteLength(JSON.stringify(body.queryPayload), `utf8`);

    return this.idempotency.execute({
      adminId,
      scope: `saved-view-create`,
      key: meta.idempotencyKey,
      payload: { workspace, name, description, queryPayload },
      execute: async () => {
        const created = await this.repository.create({
          adminId,
          workspace,
          name,
          description,
          queryPayload,
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.saved_view_create,
          resource: `saved_view`,
          resourceId: created.id,
          metadata: buildCreateAuditMetadata({ workspace, name, payloadBytes }),
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return toSummary(created as SavedViewRow);
      },
    });
  }

  async update(
    actor: SavedViewActorContext,
    savedViewId: string,
    body: {
      name?: string;
      description?: string | null;
      queryPayload?: unknown;
      expectedDeletedAtNull: number;
    },
    meta: SavedViewRequestMeta,
  ): Promise<SavedViewSummary> {
    assertExpectedDeletedAtNull(body.expectedDeletedAtNull);
    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    const hasPayload = body.queryPayload !== undefined;
    if (!hasName && !hasDescription && !hasPayload) {
      throw new BadRequestException(`No fields to update`);
    }

    const nextName = hasName ? trimRequiredName(body.name) : undefined;
    const nextDescription = hasDescription ? normalizeDescription(body.description) : undefined;
    if (hasPayload) {
      assertValidPayload(body.queryPayload);
    }
    const nextPayloadBytes = hasPayload ? Buffer.byteLength(JSON.stringify(body.queryPayload), `utf8`) : null;
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `saved-view-update`,
      key: meta.idempotencyKey,
      payload: {
        savedViewId,
        name: nextName ?? null,
        description: hasDescription ? (nextDescription ?? null) : undefined,
        queryPayload: hasPayload ? body.queryPayload : undefined,
        expectedDeletedAtNull: 0,
      },
      execute: async () => {
        const result = await this.repository.update({
          savedViewId,
          adminId,
          hasName,
          nextName,
          hasDescription,
          nextDescription,
          hasPayload,
          queryPayload: body.queryPayload,
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.saved_view_update,
          resource: `saved_view`,
          resourceId: savedViewId,
          metadata: buildUpdateAuditMetadata({
            workspace: result.updated.workspace,
            hasName,
            hasDescription,
            hasPayload,
            previousName: result.previousName,
            nextName,
            payloadBytes: nextPayloadBytes,
          }),
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return toSummary(result.updated as SavedViewRow);
      },
    });
  }

  async delete(
    actor: SavedViewActorContext,
    savedViewId: string,
    body: { expectedDeletedAtNull: number },
    meta: SavedViewRequestMeta,
  ): Promise<{ savedViewId: string; deletedAt: string }> {
    assertExpectedDeletedAtNull(body.expectedDeletedAtNull);
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `saved-view-delete`,
      key: meta.idempotencyKey,
      payload: { savedViewId, expectedDeletedAtNull: 0 },
      execute: async () => {
        const result = await this.repository.softDelete({ savedViewId, adminId });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.saved_view_delete,
          resource: `saved_view`,
          resourceId: savedViewId,
          metadata: buildDeleteAuditMetadata({
            workspace: result.lockedWorkspace,
            name: result.lockedName,
          }),
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return {
          savedViewId,
          deletedAt: result.updated.deletedAt!.toISOString(),
        };
      },
    });
  }
}
