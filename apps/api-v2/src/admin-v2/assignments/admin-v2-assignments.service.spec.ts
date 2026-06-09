import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { AdminV2AssignmentsService } from './admin-v2-assignments.service';

type AssignmentActorContext = {
  id: string;
  email: string;
  type: `ADMIN` | `SUPER`;
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

const OPS_ADMIN_ID = `11111111-1111-4111-8111-111111111111`;
const OTHER_ADMIN_ID = `22222222-2222-4222-8222-222222222222`;
const SUPER_ADMIN_ID = `33333333-3333-4333-8333-333333333333`;
const RESOURCE_ID = `44444444-4444-4444-8444-444444444444`;
const ASSIGNMENT_ID = `55555555-5555-4555-8555-555555555555`;

const opsActor: AssignmentActorContext = { id: OPS_ADMIN_ID, email: `ops@example.com`, type: `ADMIN` };
const otherActor: AssignmentActorContext = { id: OTHER_ADMIN_ID, email: `other@example.com`, type: `ADMIN` };
const superActor: AssignmentActorContext = { id: SUPER_ADMIN_ID, email: `super@example.com`, type: `SUPER` };

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

function buildService() {
  const query = {
    loadAdminSummary: jest.fn<(...a: any[]) => any>(),
    getAdminTargetForReassign: jest.fn<(...a: any[]) => any>(),
    getAssignmentContextForResource: jest.fn<(...a: any[]) => any>(),
    getActiveAssigneesForResource: jest.fn<(...a: any[]) => any>(),
  };
  const repository = {
    claim: jest.fn<(...a: any[]) => any>(),
    release: jest.fn<(...a: any[]) => any>(),
    reassign: jest.fn<(...a: any[]) => any>(),
  };
  const idempotency = {
    execute: jest.fn<(...a: any[]) => any>(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
  const adminActionAudit = {
    record: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
  };
  const accessService = {
    getAccessProfile: jest.fn<(...a: any[]) => any>(async (admin: AssignmentActorContext) => ({
      role: admin.type === `SUPER` ? `SUPER_ADMIN` : `OPS_ADMIN`,
      capabilities: [] as string[],
      workspaces: [] as string[],
      source: `bridge`,
    })),
  };

  const service = new AdminV2AssignmentsService(
    query as never,
    repository as never,
    idempotency as never,
    adminActionAudit as never,
    accessService as never,
  );

  return {
    service,
    query,
    repository,
    idempotency,
    adminActionAudit,
    accessService,
  };
}

const meta = {
  ipAddress: `127.0.0.1`,
  userAgent: `jest`,
  idempotencyKey: `idem-1`,
};

describe(`AdminV2AssignmentsService`, () => {
  describe(`claim`, () => {
    it(`inserts a new assignment when resource is unassigned and records audit`, async () => {
      const { service, repository, query, adminActionAudit } = buildService();
      repository.claim.mockResolvedValueOnce({
        status: `created`,
        assignment: activeRow(),
        createdNow: true,
      });
      query.loadAdminSummary.mockResolvedValueOnce({ id: OPS_ADMIN_ID, name: null, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `verification`, resourceId: RESOURCE_ID }, meta);

      expect(result).toEqual(
        expect.objectContaining({
          assignmentId: ASSIGNMENT_ID,
          status: `created`,
          assignedTo: expect.objectContaining({ id: OPS_ADMIN_ID, email: `ops@example.com` }),
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `assignment_claim`,
          adminId: OPS_ADMIN_ID,
          resource: `verification`,
          resourceId: RESOURCE_ID,
        }),
      );
    });

    it(`returns already-yours without re-inserting when the caller already owns the active assignment`, async () => {
      const { service, repository, query, adminActionAudit } = buildService();
      repository.claim.mockResolvedValueOnce({
        status: `already-yours`,
        assignment: activeRow(),
        createdNow: false,
      });
      query.loadAdminSummary.mockResolvedValueOnce({ id: OPS_ADMIN_ID, name: null, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `verification`, resourceId: RESOURCE_ID }, meta);

      expect(result.status).toBe(`already-yours`);
      expect(adminActionAudit.record).not.toHaveBeenCalled();
      expect(repository.claim).toHaveBeenCalledTimes(1);
    });

    it(`returns 409 when the resource is already assigned to another admin`, async () => {
      const { service, repository } = buildService();
      repository.claim.mockRejectedValueOnce(new ConflictException(`Resource already assigned to another admin`));

      await expect(
        service.claim(opsActor, { resourceType: `verification`, resourceId: RESOURCE_ID }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects unknown resourceType as 400`, async () => {
      const { service } = buildService();

      await expect(
        service.claim(opsActor, { resourceType: `consumer`, resourceId: RESOURCE_ID }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects missing resourceType as 400`, async () => {
      const { service } = buildService();

      await expect(service.claim(opsActor, { resourceId: RESOURCE_ID }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it(`rejects reason exceeding MAX_ASSIGNMENT_REASON_LENGTH as 400`, async () => {
      const { service } = buildService();

      await expect(
        service.claim(
          opsActor,
          { resourceType: `verification`, resourceId: RESOURCE_ID, reason: `x`.repeat(501) },
          meta,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`accepts payment_request resourceType, inserts the assignment, and audits payment_request`, async () => {
      const { service, repository, query, adminActionAudit } = buildService();
      repository.claim.mockResolvedValueOnce({
        status: `created`,
        assignment: activeRow({ resource_type: `payment_request` }),
        createdNow: true,
      });
      query.loadAdminSummary.mockResolvedValueOnce({ id: OPS_ADMIN_ID, name: null, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `payment_request`, resourceId: RESOURCE_ID }, meta);

      expect(result).toEqual(
        expect.objectContaining({
          assignmentId: ASSIGNMENT_ID,
          status: `created`,
          assignedTo: expect.objectContaining({ id: OPS_ADMIN_ID }),
        }),
      );
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `assignment_claim`,
          adminId: OPS_ADMIN_ID,
          resource: `payment_request`,
          resourceId: RESOURCE_ID,
        }),
      );
    });
  });

  describe(`release`, () => {
    it(`releases the caller's own active assignment and records audit`, async () => {
      const { service, repository, adminActionAudit } = buildService();
      repository.release.mockImplementationOnce(async ({ assertCanReleaseLockedAssignment }) => {
        await assertCanReleaseLockedAssignment(activeRow());
        return { row: releasedRow(), releasedFrom: OPS_ADMIN_ID };
      });

      const result = await service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta);

      expect(result.assignmentId).toBe(ASSIGNMENT_ID);
      expect(typeof result.releasedAt).toBe(`string`);
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: `assignment_release`, adminId: OPS_ADMIN_ID }),
      );
    });

    it(`allows a super-admin to release someone else's assignment`, async () => {
      const { service, repository, adminActionAudit } = buildService();
      repository.release.mockImplementationOnce(async ({ assertCanReleaseLockedAssignment }) => {
        const locked = activeRow({ assigned_to: OTHER_ADMIN_ID });
        await assertCanReleaseLockedAssignment(locked);
        return {
          row: releasedRow({ assigned_to: OTHER_ADMIN_ID, released_by: SUPER_ADMIN_ID }),
          releasedFrom: OTHER_ADMIN_ID,
        };
      });

      await service.release(superActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta);

      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `assignment_release`,
          adminId: SUPER_ADMIN_ID,
          metadata: expect.objectContaining({ releasedFrom: OTHER_ADMIN_ID }),
        }),
      );
    });

    it(`returns 403 when a non-owner non-super-admin tries to release`, async () => {
      const { service, repository } = buildService();
      repository.release.mockImplementationOnce(async ({ assertCanReleaseLockedAssignment }) => {
        await assertCanReleaseLockedAssignment(activeRow({ assigned_to: OTHER_ADMIN_ID }));
        throw new Error(`unreachable`);
      });

      await expect(
        service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it(`returns 404 when the assignment does not exist`, async () => {
      const { service, repository } = buildService();
      repository.release.mockRejectedValueOnce(new NotFoundException(`Assignment not found`));

      await expect(
        service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 409 when the assignment is already released`, async () => {
      const { service, repository } = buildService();
      repository.release.mockRejectedValueOnce(new ConflictException(`Assignment is already released`));

      await expect(
        service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects expectedReleasedAtNull other than 0`, async () => {
      const { service } = buildService();

      await expect(
        service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 1 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejects missing assignmentId as 400`, async () => {
      const { service } = buildService();

      await expect(service.release(opsActor, { expectedReleasedAtNull: 0 }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe(`reassign`, () => {
    const validBody = {
      assignmentId: ASSIGNMENT_ID,
      newAssigneeId: OTHER_ADMIN_ID,
      confirmed: true,
      reason: `Operator handoff due to OOO coverage`,
      expectedReleasedAtNull: 0,
    };

    it(`closes the old assignment, opens a new one, and writes two correlated audit entries`, async () => {
      const { service, repository, query } = buildService();
      const newAssignmentId = `66666666-6666-4666-8666-666666666666`;
      query.getAdminTargetForReassign.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      repository.reassign.mockResolvedValueOnce({
        closedRow: releasedRow(),
        newRow: activeRow({
          id: newAssignmentId,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        }),
      });
      query.loadAdminSummary.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, name: null, email: `other@example.com` });

      const result = await service.reassign(superActor, validBody, meta);

      expect(result.oldAssignmentId).toBe(ASSIGNMENT_ID);
      expect(result.newAssignmentId).toBe(newAssignmentId);
      expect(repository.reassign).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentId: ASSIGNMENT_ID,
          newAssigneeId: OTHER_ADMIN_ID,
          adminId: SUPER_ADMIN_ID,
          reason: validBody.reason,
          transferOperationId: expect.any(String),
          meta,
        }),
      );
    });

    it(`returns 403 when the actor is not SUPER_ADMIN`, async () => {
      const { service } = buildService();

      await expect(service.reassign(opsActor, validBody, meta)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it(`returns 400 when confirmed is not true`, async () => {
      const { service } = buildService();

      await expect(service.reassign(superActor, { ...validBody, confirmed: false }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it(`returns 400 when reason is missing or too short`, async () => {
      const { service } = buildService();

      await expect(service.reassign(superActor, { ...validBody, reason: `` }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.reassign(superActor, { ...validBody, reason: `short` }, meta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it(`returns 400 when reassigning to self`, async () => {
      const { service } = buildService();

      await expect(
        service.reassign(superActor, { ...validBody, newAssigneeId: SUPER_ADMIN_ID }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`returns 404 when the target admin does not exist`, async () => {
      const { service, query } = buildService();
      query.getAdminTargetForReassign.mockResolvedValueOnce(null);

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 400 when the target admin is deactivated`, async () => {
      const { service, query } = buildService();
      query.getAdminTargetForReassign.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: new Date() });

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`returns 404 when the assignment does not exist`, async () => {
      const { service, query, repository } = buildService();
      query.getAdminTargetForReassign.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      repository.reassign.mockRejectedValueOnce(new NotFoundException(`Assignment not found`));

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 409 when the assignment is already released`, async () => {
      const { service, query, repository } = buildService();
      query.getAdminTargetForReassign.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      repository.reassign.mockRejectedValueOnce(new ConflictException(`Assignment is already released`));

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(ConflictException);
    });

    it(`returns 409 when the assignment is already owned by the target admin`, async () => {
      const { service, query, repository } = buildService();
      query.getAdminTargetForReassign.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      repository.reassign.mockRejectedValueOnce(
        new ConflictException(`Resource is already assigned to the target admin`),
      );

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects expectedReleasedAtNull other than 0`, async () => {
      const { service } = buildService();

      await expect(
        service.reassign(superActor, { ...validBody, expectedReleasedAtNull: 1 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe(`getAssignmentContextForResource`, () => {
    it(`delegates assignment context loading to the query collaborator`, async () => {
      const { service, query } = buildService();
      query.getAssignmentContextForResource.mockResolvedValueOnce({ current: null, history: [] });

      await expect(service.getAssignmentContextForResource(`payment_request`, RESOURCE_ID)).resolves.toEqual({
        current: null,
        history: [],
      });
      expect(query.getAssignmentContextForResource).toHaveBeenCalledWith(`payment_request`, RESOURCE_ID);
    });
  });

  describe(`getActiveAssigneesForResource`, () => {
    it(`delegates active-assignee loading to the query collaborator`, async () => {
      const { service, query } = buildService();
      const assignees = new Map([[RESOURCE_ID, { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` }]]);
      query.getActiveAssigneesForResource.mockResolvedValueOnce(assignees);

      await expect(service.getActiveAssigneesForResource(`verification`, [RESOURCE_ID])).resolves.toBe(assignees);
      expect(query.getActiveAssigneesForResource).toHaveBeenCalledWith(`verification`, [RESOURCE_ID]);
    });
  });
});
