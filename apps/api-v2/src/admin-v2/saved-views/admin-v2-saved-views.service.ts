import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { type AdminV2SavedViewSummary, type AdminV2SavedViewsListResponse } from '@remoola/api-types';
import { Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  MAX_SAVED_VIEW_DESCRIPTION_LENGTH,
  MAX_SAVED_VIEW_NAME_LENGTH,
  MIN_SAVED_VIEW_NAME_LENGTH,
  SavedViewWorkspace,
  assertSavedViewWorkspace,
  assertValidPayload,
} from './admin-v2-saved-views.dto';

export type SavedViewRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type SavedViewActorContext = {
  id: string;
  email?: string;
  type: string;
};

export type SavedViewSummary = AdminV2SavedViewSummary;

const SAVED_VIEW_LIST_HARD_CAP = 200;

type SavedViewRow = {
  id: string;
  ownerId: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function toSummary(row: SavedViewRow): SavedViewSummary {
  return {
    id: row.id,
    workspace: row.workspace,
    name: row.name,
    description: row.description,
    queryPayload: row.queryPayload as unknown,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function trimRequiredName(raw: string | null | undefined): string {
  const trimmed = (raw ?? ``).trim();
  if (trimmed.length < MIN_SAVED_VIEW_NAME_LENGTH) {
    throw new BadRequestException(`name is required`);
  }
  if (trimmed.length > MAX_SAVED_VIEW_NAME_LENGTH) {
    throw new BadRequestException(`name is too long (max ${MAX_SAVED_VIEW_NAME_LENGTH} characters)`);
  }
  return trimmed;
}

function normalizeDescription(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_SAVED_VIEW_DESCRIPTION_LENGTH) {
    throw new BadRequestException(`description is too long (max ${MAX_SAVED_VIEW_DESCRIPTION_LENGTH} characters)`);
  }
  return trimmed;
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
export class AdminV2SavedViewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  async list(actor: SavedViewActorContext, workspace: string): Promise<AdminV2SavedViewsListResponse> {
    assertSavedViewWorkspace(workspace);
    const rows = await this.prisma.savedViewModel.findMany({
      where: {
        ownerId: actor.id,
        workspace,
        deletedAt: null,
      },
      orderBy: { name: `asc` },
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
        let created;
        try {
          created = await this.prisma.savedViewModel.create({
            data: {
              ownerId: adminId,
              workspace,
              name,
              description,
              queryPayload,
            },
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(`Saved view with this name already exists`);
          }
          throw error;
        }

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.saved_view_create,
          resource: `saved_view`,
          resourceId: created.id,
          metadata: {
            workspace,
            name,
            payloadBytes,
            severity: `standard`,
          },
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
      expectedDeletedAtNull?: number;
    },
    meta: SavedViewRequestMeta,
  ): Promise<SavedViewSummary> {
    assertExpectedDeletedAtNull(Number(body.expectedDeletedAtNull));
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
            FROM "saved_view"
            WHERE "id" = ${Prisma.sql`${savedViewId}::uuid`}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked || locked.owner_id !== adminId) {
            throw new NotFoundException(`Saved view not found`);
          }
          if (locked.deleted_at) {
            throw new ConflictException(`Saved view is already deleted`);
          }

          let updated;
          try {
            updated = await tx.savedViewModel.update({
              where: { id: savedViewId },
              data: {
                ...(hasName ? { name: nextName! } : {}),
                ...(hasDescription ? { description: nextDescription ?? null } : {}),
                ...(hasPayload ? { queryPayload: body.queryPayload as Prisma.InputJsonValue } : {}),
              },
            });
          } catch (error) {
            if (isUniqueViolation(error)) {
              throw new ConflictException(`Saved view with this name already exists`);
            }
            throw error;
          }

          return { previousName: locked.name, updated };
        });

        const changedFields = [
          ...(hasName ? [`name`] : []),
          ...(hasDescription ? [`description`] : []),
          ...(hasPayload ? [`queryPayload`] : []),
        ];
        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.saved_view_update,
          resource: `saved_view`,
          resourceId: savedViewId,
          metadata: {
            workspace: result.updated.workspace,
            changedFields,
            ...(hasName && nextName !== result.previousName ? { previousName: result.previousName } : {}),
            ...(nextPayloadBytes !== null ? { payloadBytes: nextPayloadBytes } : {}),
            severity: `standard`,
          },
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
    body: { expectedDeletedAtNull?: number },
    meta: SavedViewRequestMeta,
  ): Promise<{ savedViewId: string; deletedAt: string }> {
    assertExpectedDeletedAtNull(Number(body.expectedDeletedAtNull));
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `saved-view-delete`,
      key: meta.idempotencyKey,
      payload: { savedViewId, expectedDeletedAtNull: 0 },
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
            FROM "saved_view"
            WHERE "id" = ${Prisma.sql`${savedViewId}::uuid`}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked || locked.owner_id !== adminId) {
            throw new NotFoundException(`Saved view not found`);
          }
          if (locked.deleted_at) {
            throw new ConflictException(`Saved view is already deleted`);
          }
          const updated = await tx.savedViewModel.update({
            where: { id: savedViewId },
            data: { deletedAt: new Date() },
          });
          return { lockedName: locked.name, lockedWorkspace: locked.workspace, updated };
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.saved_view_delete,
          resource: `saved_view`,
          resourceId: savedViewId,
          metadata: {
            workspace: result.lockedWorkspace,
            name: result.lockedName,
            severity: `standard`,
          },
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
