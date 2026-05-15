import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { type AssignableResourceType } from './admin-v2-assignments.dto';
import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { sqlRequiredUuid } from '../../shared/prisma-raw.utils';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

type AssignmentRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type AssignmentRow = {
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

function isOperationalAssignmentUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === `P2002`) {
    return true;
  }

  if (error.code !== `P2010`) {
    return false;
  }

  const meta = error.meta as { code?: unknown; message?: unknown } | undefined;
  const databaseCode = typeof meta?.code === `string` ? meta.code : null;
  const message = typeof meta?.message === `string` ? meta.message : ``;
  return (
    databaseCode === `23505` &&
    (message.includes(`idx_operational_assignment_active_resource`) || message.includes(`operational_assignment`))
  );
}

@Injectable()
export class AdminV2AssignmentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  async claim(params: {
    resourceType: AssignableResourceType;
    resourceId: string;
    adminId: string;
    reason: string | null;
  }) {
    const { resourceType, resourceId, adminId, reason } = params;
    const resourceIdSql = sqlRequiredUuid(resourceId, `resourceId`);
    const adminIdSql = sqlRequiredUuid(adminId, `adminId`);

    return this.transactions.run(async (tx) => {
      const existingRows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
        SELECT "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
               "assigned_at", "released_at", "released_by", "expires_at", "reason"
        FROM "operational_assignment"
        WHERE "resource_type" = ${resourceType}
          AND "resource_id" = ${resourceIdSql}
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

      let inserted: AssignmentRow[];
      try {
        inserted = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
          INSERT INTO "operational_assignment"
            ("resource_type", "resource_id", "assigned_to", "assigned_by", "reason")
          SELECT ${resourceType},
                 ${resourceIdSql},
                 ${adminIdSql},
                 ${adminIdSql},
                 ${reason}
          WHERE NOT EXISTS (
            SELECT 1 FROM "operational_assignment"
            WHERE "resource_type" = ${resourceType}
              AND "resource_id" = ${resourceIdSql}
              AND "released_at" IS NULL
          )
          RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                    "assigned_at", "released_at", "released_by", "expires_at", "reason"
        `);
      } catch (error) {
        if (isOperationalAssignmentUniqueConflict(error)) {
          throw new ConflictException(`Resource already assigned to another admin`);
        }
        throw error;
      }
      if (inserted.length === 0) {
        throw new ConflictException(`Resource already assigned to another admin`);
      }
      return {
        status: `created` as const,
        assignment: inserted[0]!,
        createdNow: true,
      };
    });
  }

  async release(params: {
    assignmentId: string;
    adminId: string;
    assertCanReleaseLockedAssignment: (locked: AssignmentRow) => void | Promise<void>;
  }) {
    const { assignmentId, adminId, assertCanReleaseLockedAssignment } = params;
    const assignmentIdSql = sqlRequiredUuid(assignmentId, `assignmentId`);
    const adminIdSql = sqlRequiredUuid(adminId, `adminId`);

    return this.transactions.run(async (tx) => {
      const lockedRows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
        SELECT "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
               "assigned_at", "released_at", "released_by", "expires_at", "reason"
        FROM "operational_assignment"
        WHERE "id" = ${assignmentIdSql}
        FOR UPDATE
      `);
      const locked = lockedRows[0];
      if (!locked) {
        throw new NotFoundException(`Assignment not found`);
      }
      if (locked.released_at) {
        throw new ConflictException(`Assignment is already released`);
      }
      await assertCanReleaseLockedAssignment(locked);

      const updated = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
        UPDATE "operational_assignment"
        SET "released_at" = NOW(),
            "released_by" = ${adminIdSql},
            "updated_at" = NOW()
        WHERE "id" = ${assignmentIdSql}
          AND "released_at" IS NULL
        RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                  "assigned_at", "released_at", "released_by", "expires_at", "reason"
      `);
      if (updated.length === 0) {
        throw new ConflictException(`Assignment is already released`);
      }
      return { row: updated[0]!, releasedFrom: locked.assigned_to };
    });
  }

  async reassign(params: {
    assignmentId: string;
    newAssigneeId: string;
    adminId: string;
    reason: string;
    transferOperationId: string;
    meta: AssignmentRequestMeta;
  }) {
    const { assignmentId, newAssigneeId, adminId, reason, transferOperationId, meta } = params;
    const assignmentIdSql = sqlRequiredUuid(assignmentId, `assignmentId`);
    const newAssigneeIdSql = sqlRequiredUuid(newAssigneeId, `newAssigneeId`);
    const adminIdSql = sqlRequiredUuid(adminId, `adminId`);

    return this.transactions.run(async (tx) => {
      const lockedRows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
        SELECT "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
               "assigned_at", "released_at", "released_by", "expires_at", "reason"
        FROM "operational_assignment"
        WHERE "id" = ${assignmentIdSql}
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
            "released_by" = ${adminIdSql},
            "updated_at" = NOW()
        WHERE "id" = ${assignmentIdSql}
          AND "released_at" IS NULL
        RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                  "assigned_at", "released_at", "released_by", "expires_at", "reason"
      `);
      if (closed.length === 0) {
        throw new ConflictException(`Assignment is already released`);
      }
      const closedRow = closed[0]!;
      const closedResourceIdSql = sqlRequiredUuid(closedRow.resource_id, `resourceId`);

      let inserted: AssignmentRow[];
      try {
        inserted = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
          INSERT INTO "operational_assignment"
            ("resource_type", "resource_id", "assigned_to", "assigned_by", "reason")
          SELECT ${closedRow.resource_type},
                 ${closedResourceIdSql},
                 ${newAssigneeIdSql},
                 ${adminIdSql},
                 ${reason}
          WHERE NOT EXISTS (
            SELECT 1 FROM "operational_assignment"
            WHERE "resource_type" = ${closedRow.resource_type}
              AND "resource_id" = ${closedResourceIdSql}
              AND "released_at" IS NULL
          )
          RETURNING "id", "resource_type", "resource_id", "assigned_to", "assigned_by",
                    "assigned_at", "released_at", "released_by", "expires_at", "reason"
        `);
      } catch (error) {
        if (isOperationalAssignmentUniqueConflict(error)) {
          throw new ConflictException(`Resource was re-claimed concurrently; reassign aborted`);
        }
        throw error;
      }
      if (inserted.length === 0) {
        throw new ConflictException(`Resource was re-claimed concurrently; reassign aborted`);
      }
      const newRow = inserted[0]!;

      await this.adminActionAudit.recordRequiredWithClient(tx, {
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
      });
      await this.adminActionAudit.recordRequiredWithClient(tx, {
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
      });

      return { closedRow, newRow };
    });
  }
}
