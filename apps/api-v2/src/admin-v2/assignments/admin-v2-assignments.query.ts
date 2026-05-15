import { Injectable } from '@nestjs/common';

import { type AdminV2AdminRef as AdminRef, type AdminV2AssignmentContext } from '@remoola/api-types';
import { Prisma } from '@remoola/database-2';

import { mapAdminRef } from './admin-v2-assignment-policy';
import { type AssignableResourceType } from './admin-v2-assignments.dto';
import { sqlRequiredUuid, sqlRequiredUuidArray } from '../../shared/prisma-raw.utils';
import { PrismaService } from '../../shared/prisma.service';

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

type AssignmentContext = AdminV2AssignmentContext;

@Injectable()
export class AdminV2AssignmentsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async loadAdminSummary(adminId: string): Promise<AdminSummary> {
    const admin = await this.prisma.adminModel.findUnique({
      where: { id: adminId },
      select: { id: true, email: true },
    });
    if (!admin) {
      return { id: adminId, name: null, email: null };
    }
    return { id: admin.id, name: null, email: admin.email ?? null };
  }

  getAdminTargetForReassign(adminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: adminId },
      select: { id: true, deletedAt: true },
    });
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
        AND a."resource_id" = ${sqlRequiredUuid(resourceId, `resourceId`)}
      ORDER BY a."assigned_at" DESC
      LIMIT 10
    `);
    const currentRow = rows.find((row) => row.released_at === null) ?? null;
    const current = currentRow
      ? {
          id: currentRow.id,
          assignedTo: mapAdminRef({ id: currentRow.assigned_to, email: currentRow.assigned_to_email }) ?? {
            id: currentRow.assigned_to,
            name: null,
            email: null,
          },
          assignedBy: mapAdminRef({ id: currentRow.assigned_by, email: currentRow.assigned_by_email }),
          assignedAt: currentRow.assigned_at.toISOString(),
          reason: currentRow.reason,
          expiresAt: currentRow.expires_at ? currentRow.expires_at.toISOString() : null,
        }
      : null;
    const history = rows.map((row) => ({
      id: row.id,
      assignedTo: mapAdminRef({ id: row.assigned_to, email: row.assigned_to_email }) ?? {
        id: row.assigned_to,
        name: null,
        email: null,
      },
      assignedBy: mapAdminRef({ id: row.assigned_by, email: row.assigned_by_email }),
      assignedAt: row.assigned_at.toISOString(),
      releasedAt: row.released_at ? row.released_at.toISOString() : null,
      releasedBy: mapAdminRef({ id: row.released_by, email: row.released_by_email }),
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
          AND a."resource_id" = ANY(${sqlRequiredUuidArray(resourceIds, `resourceIds`)})
      `,
    );
    const result = new Map<string, AdminRef>();
    for (const row of rows) {
      result.set(row.resource_id, { id: row.assigned_to, name: null, email: row.email });
    }
    return result;
  }
}
