import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { AdminV2AssignmentsService, type AssignmentActorContext } from './admin-v2-assignments.service';

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
  const adminModel = {
    findUnique: jest.fn(),
  };
  const adminActionAuditLogModel = {
    create: jest.fn().mockResolvedValue({}),
  };
  const queryRaw = jest.fn();
  const prisma = {
    adminModel,
    adminActionAuditLogModel,
    $queryRaw: queryRaw,
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        adminActionAuditLogModel,
        $queryRaw: queryRaw,
      }),
    ),
  };
  const idempotency = {
    execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
  const adminActionAudit = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const accessService = {
    getAccessProfile: jest.fn(async (admin: AssignmentActorContext) => ({
      role: admin.type === `SUPER` ? `SUPER_ADMIN` : `OPS_ADMIN`,
      capabilities: [] as string[],
      workspaces: [] as string[],
      source: `bridge`,
    })),
  };

  const service = new AdminV2AssignmentsService(
    prisma as never,
    idempotency as never,
    adminActionAudit as never,
    accessService as never,
  );

  return {
    service,
    prisma,
    queryRaw,
    adminModel,
    adminActionAuditLogModel,
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
      const { service, queryRaw, adminModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([activeRow()]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

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
      const { service, queryRaw, adminModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow()]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `verification`, resourceId: RESOURCE_ID }, meta);

      expect(result.status).toBe(`already-yours`);
      expect(adminActionAudit.record).not.toHaveBeenCalled();
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it(`returns 409 when the resource is already assigned to another admin`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow({ assigned_to: OTHER_ADMIN_ID })]);

      await expect(
        service.claim(opsActor, { resourceType: `verification`, resourceId: RESOURCE_ID }, meta),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(`returns 409 when the atomic insert loses a concurrent race`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([]);

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
      const { service, queryRaw, adminModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `payment_request` })]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

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

    it(`accepts ledger_entry resourceType, inserts the assignment, and audits ledger_entry`, async () => {
      const { service, queryRaw, adminModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `ledger_entry` })]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `ledger_entry`, resourceId: RESOURCE_ID }, meta);

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
          resource: `ledger_entry`,
          resourceId: RESOURCE_ID,
        }),
      );
    });

    it(`accepts payout resourceType, inserts the assignment, and audits payout`, async () => {
      const { service, queryRaw, adminModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `payout` })]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `payout`, resourceId: RESOURCE_ID }, meta);

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
          resource: `payout`,
          resourceId: RESOURCE_ID,
        }),
      );
    });

    it(`accepts document resourceType, inserts the assignment, and audits document`, async () => {
      const { service, queryRaw, adminModel, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([]);
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `document` })]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

      const result = await service.claim(opsActor, { resourceType: `document`, resourceId: RESOURCE_ID }, meta);

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
          resource: `document`,
          resourceId: RESOURCE_ID,
        }),
      );
    });
  });

  describe(`release`, () => {
    it(`releases the caller's own active assignment and records audit`, async () => {
      const { service, queryRaw, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow()]);
      queryRaw.mockResolvedValueOnce([releasedRow()]);

      const result = await service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta);

      expect(result.assignmentId).toBe(ASSIGNMENT_ID);
      expect(typeof result.releasedAt).toBe(`string`);
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: `assignment_release`, adminId: OPS_ADMIN_ID }),
      );
    });

    it(`allows a super-admin to release someone else's assignment`, async () => {
      const { service, queryRaw, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow({ assigned_to: OTHER_ADMIN_ID })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ assigned_to: OTHER_ADMIN_ID, released_by: SUPER_ADMIN_ID })]);

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
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow({ assigned_to: OTHER_ADMIN_ID })]);

      await expect(
        service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it(`returns 404 when the assignment does not exist`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 409 when the assignment is already released`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([releasedRow()]);

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

    it(`releases a ledger_entry assignment owned by the caller and audits ledger_entry`, async () => {
      const { service, queryRaw, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `ledger_entry` })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ resource_type: `ledger_entry` })]);

      const result = await service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta);

      expect(result.assignmentId).toBe(ASSIGNMENT_ID);
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `assignment_release`,
          adminId: OPS_ADMIN_ID,
          resource: `ledger_entry`,
          resourceId: RESOURCE_ID,
        }),
      );
    });

    it(`releases a payout assignment owned by the caller and audits payout`, async () => {
      const { service, queryRaw, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `payout` })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ resource_type: `payout` })]);

      const result = await service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta);

      expect(result.assignmentId).toBe(ASSIGNMENT_ID);
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `assignment_release`,
          adminId: OPS_ADMIN_ID,
          resource: `payout`,
          resourceId: RESOURCE_ID,
        }),
      );
    });

    it(`releases a document assignment owned by the caller and audits document`, async () => {
      const { service, queryRaw, adminActionAudit } = buildService();
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `document` })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ resource_type: `document` })]);

      const result = await service.release(opsActor, { assignmentId: ASSIGNMENT_ID, expectedReleasedAtNull: 0 }, meta);

      expect(result.assignmentId).toBe(ASSIGNMENT_ID);
      expect(adminActionAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `assignment_release`,
          adminId: OPS_ADMIN_ID,
          resource: `document`,
          resourceId: RESOURCE_ID,
        }),
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
      const { service, queryRaw, adminModel, adminActionAuditLogModel } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([activeRow()]);
      queryRaw.mockResolvedValueOnce([releasedRow()]);
      const newAssignmentId = `66666666-6666-4666-8666-666666666666`;
      queryRaw.mockResolvedValueOnce([
        activeRow({
          id: newAssignmentId,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        }),
      ]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, email: `other@example.com` });

      const result = await service.reassign(superActor, validBody, meta);

      expect(result.oldAssignmentId).toBe(ASSIGNMENT_ID);
      expect(result.newAssignmentId).toBe(newAssignmentId);
      expect(adminActionAuditLogModel.create).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = adminActionAuditLogModel.create.mock.calls as Array<
        [{ data: { action: string; metadata: { transferOperationId?: string } } }]
      >;
      expect(firstCall[0].data.action).toBe(`assignment_release`);
      expect(secondCall[0].data.action).toBe(`assignment_reassign`);
      expect(firstCall[0].data.metadata.transferOperationId).toBeDefined();
      expect(firstCall[0].data.metadata.transferOperationId).toBe(secondCall[0].data.metadata.transferOperationId);
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
      const { service, adminModel } = buildService();
      adminModel.findUnique.mockResolvedValueOnce(null);

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 400 when the target admin is deactivated`, async () => {
      const { service, adminModel } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: new Date() });

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`returns 404 when the assignment does not exist`, async () => {
      const { service, adminModel, queryRaw } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([]);

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(NotFoundException);
    });

    it(`returns 409 when the assignment is already released`, async () => {
      const { service, adminModel, queryRaw } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([releasedRow()]);

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(ConflictException);
    });

    it(`returns 409 when the assignment is already owned by the target admin`, async () => {
      const { service, adminModel, queryRaw } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([activeRow({ assigned_to: OTHER_ADMIN_ID })]);

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(ConflictException);
    });

    it(`returns 409 when the insert loses a concurrent race`, async () => {
      const { service, adminModel, queryRaw } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([activeRow()]);
      queryRaw.mockResolvedValueOnce([releasedRow()]);
      queryRaw.mockResolvedValueOnce([]);

      await expect(service.reassign(superActor, validBody, meta)).rejects.toBeInstanceOf(ConflictException);
    });

    it(`rejects expectedReleasedAtNull other than 0`, async () => {
      const { service } = buildService();

      await expect(
        service.reassign(superActor, { ...validBody, expectedReleasedAtNull: 1 }, meta),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`reassigns a ledger_entry assignment and writes correlated audits with resource ledger_entry`, async () => {
      const { service, queryRaw, adminModel, adminActionAuditLogModel } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `ledger_entry` })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ resource_type: `ledger_entry` })]);
      const newAssignmentId = `66666666-6666-4666-8666-666666666666`;
      queryRaw.mockResolvedValueOnce([
        activeRow({
          id: newAssignmentId,
          resource_type: `ledger_entry`,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        }),
      ]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, email: `other@example.com` });

      const result = await service.reassign(superActor, validBody, meta);

      expect(result.oldAssignmentId).toBe(ASSIGNMENT_ID);
      expect(result.newAssignmentId).toBe(newAssignmentId);
      expect(adminActionAuditLogModel.create).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = adminActionAuditLogModel.create.mock.calls as Array<
        [{ data: { action: string; resource: string; metadata: { transferOperationId?: string } } }]
      >;
      expect(firstCall[0].data.action).toBe(`assignment_release`);
      expect(firstCall[0].data.resource).toBe(`ledger_entry`);
      expect(secondCall[0].data.action).toBe(`assignment_reassign`);
      expect(secondCall[0].data.resource).toBe(`ledger_entry`);
      expect(firstCall[0].data.metadata.transferOperationId).toBe(secondCall[0].data.metadata.transferOperationId);
    });

    it(`reassigns a payout assignment and writes correlated audits with resource payout`, async () => {
      const { service, queryRaw, adminModel, adminActionAuditLogModel } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `payout` })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ resource_type: `payout` })]);
      const newAssignmentId = `66666666-6666-4666-8666-666666666666`;
      queryRaw.mockResolvedValueOnce([
        activeRow({
          id: newAssignmentId,
          resource_type: `payout`,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        }),
      ]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, email: `other@example.com` });

      const result = await service.reassign(superActor, validBody, meta);

      expect(result.oldAssignmentId).toBe(ASSIGNMENT_ID);
      expect(result.newAssignmentId).toBe(newAssignmentId);
      expect(adminActionAuditLogModel.create).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = adminActionAuditLogModel.create.mock.calls as Array<
        [{ data: { action: string; resource: string; metadata: { transferOperationId?: string } } }]
      >;
      expect(firstCall[0].data.action).toBe(`assignment_release`);
      expect(firstCall[0].data.resource).toBe(`payout`);
      expect(secondCall[0].data.action).toBe(`assignment_reassign`);
      expect(secondCall[0].data.resource).toBe(`payout`);
      expect(firstCall[0].data.metadata.transferOperationId).toBe(secondCall[0].data.metadata.transferOperationId);
    });

    it(`reassigns a document assignment and writes correlated audits with resource document`, async () => {
      const { service, queryRaw, adminModel, adminActionAuditLogModel } = buildService();
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, deletedAt: null });
      queryRaw.mockResolvedValueOnce([activeRow({ resource_type: `document` })]);
      queryRaw.mockResolvedValueOnce([releasedRow({ resource_type: `document` })]);
      const newAssignmentId = `66666666-6666-4666-8666-666666666666`;
      queryRaw.mockResolvedValueOnce([
        activeRow({
          id: newAssignmentId,
          resource_type: `document`,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        }),
      ]);
      adminModel.findUnique.mockResolvedValueOnce({ id: OTHER_ADMIN_ID, email: `other@example.com` });

      const result = await service.reassign(superActor, validBody, meta);

      expect(result.oldAssignmentId).toBe(ASSIGNMENT_ID);
      expect(result.newAssignmentId).toBe(newAssignmentId);
      expect(adminActionAuditLogModel.create).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = adminActionAuditLogModel.create.mock.calls as Array<
        [{ data: { action: string; resource: string; metadata: { transferOperationId?: string } } }]
      >;
      expect(firstCall[0].data.action).toBe(`assignment_release`);
      expect(firstCall[0].data.resource).toBe(`document`);
      expect(secondCall[0].data.action).toBe(`assignment_reassign`);
      expect(secondCall[0].data.resource).toBe(`document`);
      expect(firstCall[0].data.metadata.transferOperationId).toBe(secondCall[0].data.metadata.transferOperationId);
    });
  });

  describe(`getAssignmentContextForResource`, () => {
    it(`returns null current and empty history when no rows exist`, async () => {
      const { service, queryRaw } = buildService();
      queryRaw.mockResolvedValueOnce([]);

      const result = await service.getAssignmentContextForResource(`payment_request`, RESOURCE_ID);

      expect(result).toEqual({ current: null, history: [] });
    });

    it(`returns the latest active assignment as current and aggregates history`, async () => {
      const { service, queryRaw } = buildService();
      const releasedAssignedAt = new Date(`2026-04-19T09:00:00.000Z`);
      const releasedReleasedAt = new Date(`2026-04-19T10:00:00.000Z`);
      const activeAssignedAt = new Date(`2026-04-20T11:00:00.000Z`);
      queryRaw.mockResolvedValueOnce([
        {
          id: ASSIGNMENT_ID,
          resource_id: RESOURCE_ID,
          assigned_to: OPS_ADMIN_ID,
          assigned_by: OPS_ADMIN_ID,
          released_by: null,
          assigned_at: activeAssignedAt,
          released_at: null,
          expires_at: null,
          reason: `Investigating`,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `ops@example.com`,
          released_by_email: null,
        },
        {
          id: `66666666-6666-4666-8666-666666666666`,
          resource_id: RESOURCE_ID,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          released_by: SUPER_ADMIN_ID,
          assigned_at: releasedAssignedAt,
          released_at: releasedReleasedAt,
          expires_at: null,
          reason: null,
          assigned_to_email: `other@example.com`,
          assigned_by_email: `super@example.com`,
          released_by_email: `super@example.com`,
        },
      ]);

      const result = await service.getAssignmentContextForResource(`payment_request`, RESOURCE_ID);

      expect(result.current).toEqual({
        id: ASSIGNMENT_ID,
        assignedTo: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedBy: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedAt: activeAssignedAt.toISOString(),
        reason: `Investigating`,
        expiresAt: null,
      });
      expect(result.history).toHaveLength(2);
      expect(result.history[1]).toEqual(
        expect.objectContaining({
          id: `66666666-6666-4666-8666-666666666666`,
          releasedAt: releasedReleasedAt.toISOString(),
          releasedBy: { id: SUPER_ADMIN_ID, name: null, email: `super@example.com` },
        }),
      );
    });

    it(`returns null current when only released rows exist`, async () => {
      const { service, queryRaw } = buildService();
      const assignedAt = new Date(`2026-04-19T09:00:00.000Z`);
      const releasedAt = new Date(`2026-04-19T10:00:00.000Z`);
      queryRaw.mockResolvedValueOnce([
        {
          id: ASSIGNMENT_ID,
          resource_id: RESOURCE_ID,
          assigned_to: OPS_ADMIN_ID,
          assigned_by: OPS_ADMIN_ID,
          released_by: OPS_ADMIN_ID,
          assigned_at: assignedAt,
          released_at: releasedAt,
          expires_at: null,
          reason: null,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `ops@example.com`,
          released_by_email: `ops@example.com`,
        },
      ]);

      const result = await service.getAssignmentContextForResource(`ledger_entry`, RESOURCE_ID);

      expect(result.current).toBeNull();
      expect(result.history).toHaveLength(1);
    });

    it(`returns the active payout assignment as current with payout resource_type`, async () => {
      const { service, queryRaw } = buildService();
      const assignedAt = new Date(`2026-04-20T11:00:00.000Z`);
      queryRaw.mockResolvedValueOnce([
        {
          id: ASSIGNMENT_ID,
          resource_id: RESOURCE_ID,
          assigned_to: OPS_ADMIN_ID,
          assigned_by: OPS_ADMIN_ID,
          released_by: null,
          assigned_at: assignedAt,
          released_at: null,
          expires_at: null,
          reason: `Investigating failed payout`,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `ops@example.com`,
          released_by_email: null,
        },
      ]);

      const result = await service.getAssignmentContextForResource(`payout`, RESOURCE_ID);

      expect(result.current).toEqual({
        id: ASSIGNMENT_ID,
        assignedTo: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedBy: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedAt: assignedAt.toISOString(),
        reason: `Investigating failed payout`,
        expiresAt: null,
      });
      expect(result.history).toHaveLength(1);
    });

    it(`returns the active document assignment as current with document resource_type`, async () => {
      const { service, queryRaw } = buildService();
      const assignedAt = new Date(`2026-04-20T11:00:00.000Z`);
      queryRaw.mockResolvedValueOnce([
        {
          id: ASSIGNMENT_ID,
          resource_id: RESOURCE_ID,
          assigned_to: OPS_ADMIN_ID,
          assigned_by: OPS_ADMIN_ID,
          released_by: null,
          assigned_at: assignedAt,
          released_at: null,
          expires_at: null,
          reason: `Reviewing supporting evidence`,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `ops@example.com`,
          released_by_email: null,
        },
      ]);

      const result = await service.getAssignmentContextForResource(`document`, RESOURCE_ID);

      expect(result.current).toEqual({
        id: ASSIGNMENT_ID,
        assignedTo: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedBy: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedAt: assignedAt.toISOString(),
        reason: `Reviewing supporting evidence`,
        expiresAt: null,
      });
      expect(result.history).toHaveLength(1);
    });
  });
});
