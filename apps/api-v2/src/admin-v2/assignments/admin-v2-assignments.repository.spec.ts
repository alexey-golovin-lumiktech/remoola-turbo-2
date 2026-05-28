import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { AdminV2AssignmentsRepository } from './admin-v2-assignments.repository';
import { SqlValidationError } from '../../shared/prisma-raw.utils';

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

const OPS_ADMIN_ID = `11111111-1111-4111-8111-111111111111`;
const OTHER_ADMIN_ID = `22222222-2222-4222-8222-222222222222`;
const SUPER_ADMIN_ID = `33333333-3333-4333-8333-333333333333`;
const RESOURCE_ID = `44444444-4444-4444-8444-444444444444`;
const ASSIGNMENT_ID = `55555555-5555-4555-8555-555555555555`;

function activeRow(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    id: ASSIGNMENT_ID,
    resource_type: `verification`,
    resource_id: RESOURCE_ID,
    assigned_to: OPS_ADMIN_ID,
    assigned_by: OPS_ADMIN_ID,
    assigned_at: new Date(`2026-04-20T10:00:00.000Z`),
    released_at: null,
    released_by: null,
    expires_at: null,
    reason: null,
    ...overrides,
  };
}

function releasedRow(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return activeRow({
    released_at: new Date(`2026-04-20T11:00:00.000Z`),
    released_by: OPS_ADMIN_ID,
    ...overrides,
  });
}

function buildRepository() {
  const queryRaw = jest.fn<(...a: any[]) => any>();
  type TxMock = {
    $queryRaw: typeof queryRaw;
  };
  const tx: TxMock = {
    $queryRaw: queryRaw,
  };
  const prisma = {
    $transaction: jest.fn<(...a: any[]) => any>(async (callback: (tx: TxMock) => Promise<unknown>) => callback(tx)),
  };
  const adminActionAudit = {
    recordRequiredWithClient: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
  };

  return {
    repository: new AdminV2AssignmentsRepository(
      prisma as never,
      { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
      adminActionAudit as never,
    ),
    prisma,
    queryRaw,
    adminActionAudit,
  };
}

describe(`AdminV2AssignmentsRepository`, () => {
  describe(`claim`, () => {
    it(`creates a new assignment when the resource is unassigned`, async () => {
      const { repository, queryRaw } = buildRepository();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([activeRow()]);

      const result = await repository.claim({
        resourceType: `verification`,
        resourceId: RESOURCE_ID,
        adminId: OPS_ADMIN_ID,
        reason: null,
      });

      expect(result).toEqual({
        status: `created`,
        assignment: activeRow(),
        createdNow: true,
      });
      expect(queryRaw).toHaveBeenCalledTimes(2);
    });

    it(`returns already-yours when the caller already holds the active assignment`, async () => {
      const { repository, queryRaw } = buildRepository();
      queryRaw.mockResolvedValueOnce([activeRow()]);

      const result = await repository.claim({
        resourceType: `verification`,
        resourceId: RESOURCE_ID,
        adminId: OPS_ADMIN_ID,
        reason: null,
      });

      expect(result).toEqual({
        status: `already-yours`,
        assignment: activeRow(),
        createdNow: false,
      });
    });

    it(`maps unique-index races to a conflict exception`, async () => {
      const { repository, queryRaw } = buildRepository();
      const duplicateError = Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
        code: `P2010`,
        meta: {
          code: `23505`,
          message: `duplicate key value violates unique constraint "idx_operational_assignment_active_resource"`,
        },
      });
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockRejectedValueOnce(duplicateError);

      await expect(
        repository.claim({
          resourceType: `verification`,
          resourceId: RESOURCE_ID,
          adminId: OPS_ADMIN_ID,
          reason: null,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects invalid command UUIDs before issuing raw SQL`, async () => {
      const { repository, queryRaw } = buildRepository();

      await expect(
        repository.claim({
          resourceType: `verification`,
          resourceId: `not-a-uuid`,
          adminId: OPS_ADMIN_ID,
          reason: null,
        }),
      ).rejects.toBeInstanceOf(SqlValidationError);
      expect(queryRaw).not.toHaveBeenCalled();
    });
  });

  describe(`release`, () => {
    it(`locks the row, delegates the transactional policy hook, and persists the release`, async () => {
      const { repository, queryRaw } = buildRepository();
      const assertCanReleaseLockedAssignment = jest.fn<(...a: any[]) => any>();
      queryRaw.mockResolvedValueOnce([activeRow()]);
      queryRaw.mockResolvedValueOnce([releasedRow()]);

      const result = await repository.release({
        assignmentId: ASSIGNMENT_ID,
        adminId: OPS_ADMIN_ID,
        assertCanReleaseLockedAssignment,
      });

      expect(assertCanReleaseLockedAssignment).toHaveBeenCalledWith(activeRow());
      expect(result).toEqual({
        row: releasedRow(),
        releasedFrom: OPS_ADMIN_ID,
      });
    });

    it(`does not update when the service callback rejects the release`, async () => {
      const { repository, queryRaw } = buildRepository();
      const assertCanReleaseLockedAssignment = jest.fn<(...a: any[]) => any>(async () => {
        throw new ForbiddenException(`not yours`);
      });
      queryRaw.mockResolvedValueOnce([activeRow({ assigned_to: OTHER_ADMIN_ID })]);

      await expect(
        repository.release({
          assignmentId: ASSIGNMENT_ID,
          adminId: OPS_ADMIN_ID,
          assertCanReleaseLockedAssignment,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it(`rejects invalid assignment IDs before acquiring a lock`, async () => {
      const { repository, queryRaw } = buildRepository();

      await expect(
        repository.release({
          assignmentId: `not-a-uuid`,
          adminId: OPS_ADMIN_ID,
          assertCanReleaseLockedAssignment: jest.fn<(...a: any[]) => any>(),
        }),
      ).rejects.toBeInstanceOf(SqlValidationError);
      expect(queryRaw).not.toHaveBeenCalled();
    });
  });

  describe(`reassign`, () => {
    it(`closes the old row, inserts the new row, and writes correlated audit entries`, async () => {
      const { repository, queryRaw, adminActionAudit } = buildRepository();
      const transferOperationId = `transfer-123`;
      const newAssignmentId = `66666666-6666-4666-8666-666666666666`;
      queryRaw.mockResolvedValueOnce([activeRow()]);
      queryRaw.mockResolvedValueOnce([releasedRow({ released_by: SUPER_ADMIN_ID })]);
      queryRaw.mockResolvedValueOnce([
        activeRow({
          id: newAssignmentId,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        }),
      ]);

      const result = await repository.reassign({
        assignmentId: ASSIGNMENT_ID,
        newAssigneeId: OTHER_ADMIN_ID,
        adminId: SUPER_ADMIN_ID,
        reason: `Operator handoff due to OOO coverage`,
        transferOperationId,
        meta: {
          ipAddress: `127.0.0.1`,
          userAgent: `jest`,
        },
      });

      expect(result.closedRow.id).toBe(ASSIGNMENT_ID);
      expect(result.newRow.id).toBe(newAssignmentId);
      expect(adminActionAudit.recordRequiredWithClient).toHaveBeenCalledTimes(2);
      expect(adminActionAudit.recordRequiredWithClient).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({
          action: `assignment_release`,
          metadata: expect.objectContaining({ transferOperationId, reassignedTo: OTHER_ADMIN_ID }),
        }),
      );
      expect(adminActionAudit.recordRequiredWithClient).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        expect.objectContaining({
          action: `assignment_reassign`,
          metadata: expect.objectContaining({ transferOperationId, toAdmin: OTHER_ADMIN_ID }),
        }),
      );
    });

    it(`maps concurrent unique conflicts to a reassign conflict`, async () => {
      const { repository, queryRaw } = buildRepository();
      const duplicateError = Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
        code: `P2010`,
        meta: {
          code: `23505`,
          message: `duplicate key value violates unique constraint "idx_operational_assignment_active_resource"`,
        },
      });
      queryRaw.mockResolvedValueOnce([activeRow()]);
      queryRaw.mockResolvedValueOnce([releasedRow({ released_by: SUPER_ADMIN_ID })]);
      queryRaw.mockRejectedValueOnce(duplicateError);

      await expect(
        repository.reassign({
          assignmentId: ASSIGNMENT_ID,
          newAssigneeId: OTHER_ADMIN_ID,
          adminId: SUPER_ADMIN_ID,
          reason: `Operator handoff due to OOO coverage`,
          transferOperationId: `transfer-123`,
          meta: {},
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects invalid reassign command UUIDs before acquiring a lock`, async () => {
      const { repository, queryRaw } = buildRepository();

      await expect(
        repository.reassign({
          assignmentId: ASSIGNMENT_ID,
          newAssigneeId: `not-a-uuid`,
          adminId: SUPER_ADMIN_ID,
          reason: `Operator handoff due to OOO coverage`,
          transferOperationId: `transfer-123`,
          meta: {},
        }),
      ).rejects.toBeInstanceOf(SqlValidationError);
      expect(queryRaw).not.toHaveBeenCalled();
    });
  });
});
