import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { type AdminV2AdminRef, type AdminV2AssignmentContext } from '@remoola/api-types';
import { Prisma } from '@remoola/database-2';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  ASSIGNABLE_RESOURCE_TYPES,
  AssignableResourceType,
  MAX_ASSIGNMENT_REASON_LENGTH,
  MIN_ASSIGNMENT_REASON_LENGTH,
  assertResourceType,
} from './admin-v2-assignments.dto';

type AssignmentRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type AssignmentActorContext = {
  id: string;
  email?: string;
  type: string;
};

type AssignmentRow = {
  id: string;
  resource_type: string;
  resource_id: string;
  assigned_to: string;
  assigned_by: string | null;
  assigned_at: Date;
  released_at: Date | null;
  released_by: string | null;
  expires_at: Date | null;
  reason: string | null;
};

type AdminSummary = {
  id: string;
  name: string | null;
  email: string | null;
};

type AssignmentSummaryRow = {
  id: string;
  resource_id: string;
  assigned_to: string;
  assigned_by: string | null;
  released_by: string | null;
  assigned_at: Date;
  released_at: Date | null;
  expires_at: Date | null;
  reason: string | null;
  assigned_to_email: string | null;
  assigned_by_email: string | null;
  released_by_email: string | null;
};

export type AdminRef = AdminV2AdminRef;

function mapAdminRef(id: string | null, email: string | null): AdminRef | null {
  if (!id) return null;
  return { id, name: null, email };
}

type AssignmentContext = AdminV2AssignmentContext;

function trimReason(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

function validateOptionalReason(raw: string | null | undefined): string | null {
  const normalized = trimReason(raw);
  if (normalized == null) return null;
  if (normalized.length > MAX_ASSIGNMENT_REASON_LENGTH) {
    throw new BadRequestException(`Reason is too long (max ${MAX_ASSIGNMENT_REASON_LENGTH} characters)`);
  }
  return normalized;
}

function validateMandatoryReason(raw: string | null | undefined): string {
  const normalized = trimReason(raw);
  if (normalized == null) {
    throw new BadRequestException(`Reason is required`);
  }
  if (normalized.length < MIN_ASSIGNMENT_REASON_LENGTH) {
    throw new BadRequestException(`Reason is too short (min ${MIN_ASSIGNMENT_REASON_LENGTH} characters)`);
  }
  if (normalized.length > MAX_ASSIGNMENT_REASON_LENGTH) {
    throw new BadRequestException(`Reason is too long (max ${MAX_ASSIGNMENT_REASON_LENGTH} characters)`);
  }
  return normalized;
}

function assertExpectedReleasedAtNull(value: number) {
  if (value !== 0) {
    throw new BadRequestException(`expectedReleasedAtNull must be 0`);
  }
}

@Injectable()
export class AdminV2AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly adminActionAudit: AdminActionAuditService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  async claim(
    actor: AssignmentActorContext,
    body: { resourceType?: string; resourceId?: string; reason?: string | null },
    meta: AssignmentRequestMeta,
  ) {
    const adminId = actor.id;
    if (!body.resourceType || typeof body.resourceType !== `string`) {
      throw new BadRequestException(`resourceType is required`);
    }
    assertResourceType(body.resourceType);
    const resourceType: AssignableResourceType = body.resourceType;
    const resourceId = body.resourceId ?? ``;
    const reason = validateOptionalReason(body.reason);

    return this.idempotency.execute({
      adminId,
      scope: `assignment-claim`,
      key: meta.idempotencyKey,
      payload: { resourceType, resourceId, reason },
      execute: async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          const existingRows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            SELECT "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                   "assigned_at", "released_at", "released_by", "expires_at", "reason"
            FROM "operational_assignment"
            WHERE "resource_type" = ${resourceType}
              AND "resource_id" = ${Prisma.sql`${resourceId}::uuid`}
              AND "released_at" IS NULL
            ORDER BY "assigned_at" DESC
            LIMIT 1
            FOR UPDATE
          `);
          const existing = existingRows[0];
          if (existing) {
            if (existing.assigned_to === adminId) {
              return {
                status: `already-yours` as const,
                assignment: existing,
                createdNow: false,
              };
            }
            throw new ConflictException(`Resource already assigned to another admin`);
          }

          const inserted = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            INSERT INTO "operational_assignment"
              ("resource_type", "resource_id", "assigned_to", "assigned_by", "reason")
            SELECT ${resourceType},
                   ${Prisma.sql`${resourceId}::uuid`},
                   ${Prisma.sql`${adminId}::uuid`},
                   ${Prisma.sql`${adminId}::uuid`},
                   ${reason}
            WHERE NOT EXISTS (
              SELECT 1 FROM "operational_assignment"
              WHERE "resource_type" = ${resourceType}
                AND "resource_id" = ${Prisma.sql`${resourceId}::uuid`}
                AND "released_at" IS NULL
            )
            RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                      "assigned_at", "released_at", "released_by", "expires_at", "reason"
          `);
          if (inserted.length === 0) {
            throw new ConflictException(`Resource already assigned to another admin`);
          }
          return {
            status: `created` as const,
            assignment: inserted[0]!,
            createdNow: true,
          };
        });

        if (result.createdNow) {
          await this.adminActionAudit.record({
            adminId,
            action: ADMIN_ACTION_AUDIT_ACTIONS.assignment_claim,
            resource: resourceType,
            resourceId,
            metadata: {
              assignmentId: result.assignment.id,
              reason,
              severity: `high`,
            },
            ipAddress: meta.ipAddress ?? null,
            userAgent: meta.userAgent ?? null,
          });
        }

        const assignedTo = await this.loadAdminSummary(result.assignment.assigned_to);
        return {
          assignmentId: result.assignment.id,
          assignedAt: result.assignment.assigned_at.toISOString(),
          assignedTo,
          status: result.status,
        };
      },
    });
  }

  async release(
    actor: AssignmentActorContext,
    body: { assignmentId?: string; reason?: string | null; expectedReleasedAtNull?: number },
    meta: AssignmentRequestMeta,
  ) {
    if (!body.assignmentId) {
      throw new BadRequestException(`assignmentId is required`);
    }
    assertExpectedReleasedAtNull(Number(body.expectedReleasedAtNull));
    const reason = validateOptionalReason(body.reason);
    const assignmentId = body.assignmentId;
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `assignment-release`,
      key: meta.idempotencyKey,
      payload: { assignmentId, reason, expectedReleasedAtNull: 0 },
      execute: async () => {
        const profile = await this.accessService.getAccessProfile(actor);
        const release = await this.prisma.$transaction(async (tx) => {
          const lockedRows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            SELECT "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                   "assigned_at", "released_at", "released_by", "expires_at", "reason"
            FROM "operational_assignment"
            WHERE "id" = ${Prisma.sql`${assignmentId}::uuid`}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked) {
            throw new NotFoundException(`Assignment not found`);
          }
          if (locked.released_at) {
            throw new ConflictException(`Assignment is already released`);
          }
          const isOwner = locked.assigned_to === adminId;
          const isSuperAdmin = profile.role === `SUPER_ADMIN`;
          if (!isOwner && !isSuperAdmin) {
            throw new ForbiddenException(`Only the assigned owner or a super-admin can release this assignment`);
          }

          const updated = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            UPDATE "operational_assignment"
            SET "released_at" = NOW(),
                "released_by" = ${Prisma.sql`${adminId}::uuid`},
                "updated_at" = NOW()
            WHERE "id" = ${Prisma.sql`${assignmentId}::uuid`}
              AND "released_at" IS NULL
            RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                      "assigned_at", "released_at", "released_by", "expires_at", "reason"
          `);
          if (updated.length === 0) {
            throw new ConflictException(`Assignment is already released`);
          }
          return { row: updated[0]!, releasedFrom: locked.assigned_to };
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.assignment_release,
          resource: release.row.resource_type,
          resourceId: release.row.resource_id,
          metadata: {
            assignmentId: release.row.id,
            reason,
            releasedFrom: release.releasedFrom,
            severity: `high`,
          },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return {
          assignmentId: release.row.id,
          releasedAt: release.row.released_at!.toISOString(),
        };
      },
    });
  }

  async reassign(
    actor: AssignmentActorContext,
    body: {
      assignmentId?: string;
      newAssigneeId?: string;
      confirmed?: boolean;
      reason?: string;
      expectedReleasedAtNull?: number;
    },
    meta: AssignmentRequestMeta,
  ) {
    if (!body.assignmentId) {
      throw new BadRequestException(`assignmentId is required`);
    }
    if (!body.newAssigneeId) {
      throw new BadRequestException(`newAssigneeId is required`);
    }
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for reassign`);
    }
    assertExpectedReleasedAtNull(Number(body.expectedReleasedAtNull));
    const reason = validateMandatoryReason(body.reason);

    const adminId = actor.id;
    const profile = await this.accessService.getAccessProfile(actor);
    if (profile.role !== `SUPER_ADMIN`) {
      throw new ForbiddenException(`Reassign requires SUPER_ADMIN`);
    }

    const assignmentId = body.assignmentId;
    const newAssigneeId = body.newAssigneeId;
    if (newAssigneeId === adminId) {
      throw new BadRequestException(`Reassign to self is not allowed; use release + claim instead`);
    }

    const targetAdmin = await this.prisma.adminModel.findUnique({
      where: { id: newAssigneeId },
      select: { id: true, deletedAt: true },
    });
    if (!targetAdmin) {
      throw new NotFoundException(`Target admin not found`);
    }
    if (targetAdmin.deletedAt) {
      throw new BadRequestException(`Target admin is deactivated`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `assignment-reassign`,
      key: meta.idempotencyKey,
      payload: { assignmentId, newAssigneeId, confirmed: true, reason, expectedReleasedAtNull: 0 },
      execute: async () => {
        const transferOperationId = randomUUID();
        const result = await this.prisma.$transaction(async (tx) => {
          const lockedRows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            SELECT "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                   "assigned_at", "released_at", "released_by", "expires_at", "reason"
            FROM "operational_assignment"
            WHERE "id" = ${Prisma.sql`${assignmentId}::uuid`}
            FOR UPDATE
          `);
          const locked = lockedRows[0];
          if (!locked) {
            throw new NotFoundException(`Assignment not found`);
          }
          if (locked.released_at) {
            throw new ConflictException(`Assignment is already released`);
          }
          if (locked.assigned_to === newAssigneeId) {
            throw new ConflictException(`Resource is already assigned to the target admin`);
          }

          const closed = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            UPDATE "operational_assignment"
            SET "released_at" = NOW(),
                "released_by" = ${Prisma.sql`${adminId}::uuid`},
                "updated_at" = NOW()
            WHERE "id" = ${Prisma.sql`${assignmentId}::uuid`}
              AND "released_at" IS NULL
            RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                      "assigned_at", "released_at", "released_by", "expires_at", "reason"
          `);
          if (closed.length === 0) {
            throw new ConflictException(`Assignment is already released`);
          }
          const closedRow = closed[0]!;

          const inserted = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
            INSERT INTO "operational_assignment"
              ("resource_type", "resource_id", "assigned_to", "assigned_by", "reason")
            SELECT ${closedRow.resource_type},
                   ${Prisma.sql`${closedRow.resource_id}::uuid`},
                   ${Prisma.sql`${newAssigneeId}::uuid`},
                   ${Prisma.sql`${adminId}::uuid`},
                   ${reason}
            WHERE NOT EXISTS (
              SELECT 1 FROM "operational_assignment"
              WHERE "resource_type" = ${closedRow.resource_type}
                AND "resource_id" = ${Prisma.sql`${closedRow.resource_id}::uuid`}
                AND "released_at" IS NULL
            )
            RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                      "assigned_at", "released_at", "released_by", "expires_at", "reason"
          `);
          if (inserted.length === 0) {
            throw new ConflictException(`Resource was re-claimed concurrently; reassign aborted`);
          }
          const newRow = inserted[0]!;

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.assignment_release,
              resource: closedRow.resource_type,
              resourceId: closedRow.resource_id,
              metadata: {
                assignmentId: closedRow.id,
                reason,
                reassignedFrom: closedRow.assigned_to,
                reassignedTo: newAssigneeId,
                transferOperationId,
                severity: `high`,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.assignment_reassign,
              resource: closedRow.resource_type,
              resourceId: closedRow.resource_id,
              metadata: {
                oldAssignmentId: closedRow.id,
                newAssignmentId: newRow.id,
                fromAdmin: closedRow.assigned_to,
                toAdmin: newAssigneeId,
                reason,
                transferOperationId,
                severity: `high`,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });

          return { closedRow, newRow };
        });

        const assignedTo = await this.loadAdminSummary(result.newRow.assigned_to);
        return {
          oldAssignmentId: result.closedRow.id,
          newAssignmentId: result.newRow.id,
          releasedAt: result.closedRow.released_at!.toISOString(),
          assignedAt: result.newRow.assigned_at.toISOString(),
          assignedTo,
        };
      },
    });
  }

  get supportedResourceTypes(): readonly AssignableResourceType[] {
    return ASSIGNABLE_RESOURCE_TYPES;
  }

  async getAssignmentContextForResource(
    resourceType: AssignableResourceType,
    resourceId: string,
  ): Promise<AssignmentContext> {
    const rows = await this.prisma.$queryRaw<AssignmentSummaryRow[]>(Prisma.sql`
      SELECT
        a."id",
        a."resource_id",
        a."assigned_to",
        a."assigned_by",
        a."released_by",
        a."assigned_at",
        a."released_at",
        a."expires_at",
        a."reason",
        at."email" AS assigned_to_email,
        ab."email" AS assigned_by_email,
        rb."email" AS released_by_email
      FROM "operational_assignment" a
      LEFT JOIN "admin" at ON at."id" = a."assigned_to"
      LEFT JOIN "admin" ab ON ab."id" = a."assigned_by"
      LEFT JOIN "admin" rb ON rb."id" = a."released_by"
      WHERE a."resource_type" = ${resourceType}
        AND a."resource_id" = ${Prisma.sql`${resourceId}::uuid`}
      ORDER BY a."assigned_at" DESC
      LIMIT 10
    `);
    const currentRow = rows.find((row) => row.released_at === null) ?? null;
    const current = currentRow
      ? {
          id: currentRow.id,
          assignedTo: mapAdminRef(currentRow.assigned_to, currentRow.assigned_to_email) ?? {
            id: currentRow.assigned_to,
            name: null,
            email: null,
          },
          assignedBy: mapAdminRef(currentRow.assigned_by, currentRow.assigned_by_email),
          assignedAt: currentRow.assigned_at.toISOString(),
          reason: currentRow.reason,
          expiresAt: currentRow.expires_at ? currentRow.expires_at.toISOString() : null,
        }
      : null;
    const history = rows.map((row) => ({
      id: row.id,
      assignedTo: mapAdminRef(row.assigned_to, row.assigned_to_email) ?? {
        id: row.assigned_to,
        name: null,
        email: null,
      },
      assignedBy: mapAdminRef(row.assigned_by, row.assigned_by_email),
      assignedAt: row.assigned_at.toISOString(),
      releasedAt: row.released_at ? row.released_at.toISOString() : null,
      releasedBy: mapAdminRef(row.released_by, row.released_by_email),
      reason: row.reason,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    }));
    return { current, history };
  }

  async getActiveAssigneesForResource(
    resourceType: AssignableResourceType,
    resourceIds: string[],
  ): Promise<Map<string, AdminRef>> {
    if (resourceIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<Array<{ resource_id: string; assigned_to: string; email: string | null }>>(
      Prisma.sql`
        SELECT a."resource_id"::text AS resource_id, a."assigned_to"::text AS assigned_to, ad."email" AS email
        FROM "operational_assignment" a
        LEFT JOIN "admin" ad ON ad."id" = a."assigned_to"
        WHERE a."resource_type" = ${resourceType}
          AND a."released_at" IS NULL
          AND a."resource_id" = ANY(${resourceIds}::uuid[])
      `,
    );
    const result = new Map<string, AdminRef>();
    for (const row of rows) {
      result.set(row.resource_id, { id: row.assigned_to, name: null, email: row.email });
    }
    return result;
  }

  private async loadAdminSummary(adminId: string): Promise<AdminSummary> {
    const admin = await this.prisma.adminModel.findUnique({
      where: { id: adminId },
      select: { id: true, email: true },
    });
    if (!admin) {
      return { id: adminId, name: null, email: null };
    }
    return { id: admin.id, name: null, email: admin.email ?? null };
  }
}
