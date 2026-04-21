import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { AdminV2AdminsController } from './admin-v2-admins.controller';

describe(`AdminV2AdminsController`, () => {
  it(`guards read routes with admins.read and write routes with admins.manage only`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `SUPER_ADMIN`,
      capabilities: [`admins.read`, `admins.manage`],
      workspaces: [`admins`],
      source: `schema`,
    }));
    const listAdmins = jest.fn(async () => ({ items: [], pendingInvitations: [], total: 0, page: 2, pageSize: 10 }));
    const getAdminCase = jest.fn(async () => ({ id: `admin-2` }));
    const inviteAdmin = jest.fn(async () => ({ invitationId: `inv-1` }));
    const deactivateAdmin = jest.fn(async () => ({ adminId: `admin-2` }));
    const restoreAdmin = jest.fn(async () => ({ adminId: `admin-2` }));
    const changeAdminRole = jest.fn(async () => ({ adminId: `admin-2` }));
    const changeAdminPermissions = jest.fn(async () => ({ adminId: `admin-2` }));
    const resetAdminPassword = jest.fn(async () => ({ adminId: `admin-2` }));

    const listSessionsForAdmin = jest.fn(async () => ({ sessions: [] }));
    const revokeSessionAsManager = jest.fn(async () => ({
      ok: true,
      revokedSessionId: `session-2`,
      alreadyRevoked: false,
    }));

    const controller = new AdminV2AdminsController(
      {
        listAdmins,
        getAdminCase,
        inviteAdmin,
        deactivateAdmin,
        restoreAdmin,
        changeAdminRole,
        changeAdminPermissions,
        resetAdminPassword,
      } as never,
      { assertCapability } as never,
      { listSessionsForAdmin, revokeSessionAsManager } as never,
    );

    const identity = {
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      sessionId: `session-1`,
    } as never;

    await controller.listAdmins(identity, { page: `2`, pageSize: `10`, q: `ops`, status: `ACTIVE` });
    await controller.getAdminCase(identity, `admin-2`);
    await controller.inviteAdmin(identity, { email: `ops@example.com`, roleKey: `OPS_ADMIN` }, {
      ip: `127.0.0.1`,
      headers: { 'user-agent': `jest`, 'idempotency-key': `idem-1` },
    } as never);
    await controller.deactivateAdmin(identity, `admin-2`, { version: 1, confirmed: true, reason: `offboarded` }, {
      ip: `127.0.0.1`,
      headers: { 'user-agent': `jest`, 'idempotency-key': `idem-2` },
    } as never);
    await controller.restoreAdmin(identity, `admin-2`, { version: 2 }, {
      ip: `127.0.0.1`,
      headers: { 'user-agent': `jest`, 'idempotency-key': `idem-3` },
    } as never);
    await controller.changeAdminRole(identity, `admin-2`, { version: 3, confirmed: true, roleKey: `SUPER_ADMIN` }, {
      ip: `127.0.0.1`,
      headers: { 'user-agent': `jest`, 'idempotency-key': `idem-4` },
    } as never);
    await controller.changeAdminPermissions(
      identity,
      `admin-2`,
      {
        version: 4,
        capabilityOverrides: [
          { capability: `documents.manage`, mode: `grant` },
          { capability: `admins.manage`, mode: `deny` },
        ],
      },
      {
        ip: `127.0.0.1`,
        headers: { 'user-agent': `jest`, 'idempotency-key': `idem-5` },
      } as never,
    );
    await controller.resetAdminPassword(identity, `admin-2`, { version: 5 }, {
      ip: `127.0.0.1`,
      headers: { 'user-agent': `jest`, 'idempotency-key': `idem-6` },
    } as never);

    expect(assertCapability).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: `admin-1` }), `admins.read`);
    expect(listAdmins).toHaveBeenCalledWith({ page: 2, pageSize: 10, q: `ops`, status: `ACTIVE` });
    expect(assertCapability).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: `admin-1` }), `admins.read`);
    expect(getAdminCase).toHaveBeenCalledWith(`admin-2`);
    expect(assertCapability).toHaveBeenNthCalledWith(3, expect.objectContaining({ id: `admin-1` }), `admins.manage`);
    expect(inviteAdmin).toHaveBeenCalledWith(
      `admin-1`,
      { email: `ops@example.com`, roleKey: `OPS_ADMIN` },
      expect.objectContaining({ idempotencyKey: `idem-1` }),
    );
    expect(deactivateAdmin).toHaveBeenCalledWith(
      `admin-2`,
      `admin-1`,
      { version: 1, confirmed: true, reason: `offboarded` },
      expect.objectContaining({ idempotencyKey: `idem-2` }),
    );
    expect(restoreAdmin).toHaveBeenCalledWith(
      `admin-2`,
      `admin-1`,
      { version: 2 },
      expect.objectContaining({ idempotencyKey: `idem-3` }),
    );
    expect(changeAdminRole).toHaveBeenCalledWith(
      `admin-2`,
      `admin-1`,
      { version: 3, confirmed: true, roleKey: `SUPER_ADMIN` },
      expect.objectContaining({ idempotencyKey: `idem-4` }),
    );
    expect(changeAdminPermissions).toHaveBeenCalledWith(
      `admin-2`,
      `admin-1`,
      {
        version: 4,
        capabilityOverrides: [
          { capability: `documents.manage`, mode: `grant` },
          { capability: `admins.manage`, mode: `deny` },
        ],
      },
      expect.objectContaining({ idempotencyKey: `idem-5` }),
    );
    expect(resetAdminPassword).toHaveBeenCalledWith(
      `admin-2`,
      `admin-1`,
      { version: 5 },
      expect.objectContaining({ idempotencyKey: `idem-6` }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(8, expect.objectContaining({ id: `admin-1` }), `admins.manage`);
  });

  describe(`session management endpoints`, () => {
    function buildSessionsHarness(opts?: {
      assertCapabilityImpl?: (identity: unknown, capability: string) => Promise<unknown>;
      listSessionsForAdmin?: jest.Mock;
      revokeSessionAsManager?: jest.Mock;
    }) {
      const assertCapability = jest.fn(
        opts?.assertCapabilityImpl ??
          (async () => ({
            role: `SUPER_ADMIN`,
            capabilities: [`admins.read`, `admins.manage`],
            workspaces: [`admins`],
            source: `schema`,
          })),
      );
      const listSessionsForAdmin =
        opts?.listSessionsForAdmin ??
        jest.fn(async () => ({
          sessions: [
            {
              id: `session-foo`,
              sessionFamilyId: `family-foo`,
              createdAt: `2026-04-21T10:00:00.000Z`,
              lastUsedAt: `2026-04-21T10:00:00.000Z`,
              expiresAt: `2026-05-21T10:00:00.000Z`,
              revokedAt: null,
              invalidatedReason: null,
              replacedById: null,
            },
          ],
        }));
      const revokeSessionAsManager =
        opts?.revokeSessionAsManager ??
        jest.fn(async () => ({
          ok: true,
          revokedSessionId: `session-foo`,
          alreadyRevoked: false,
        }));
      const adminsService = {
        listAdmins: jest.fn(),
        getAdminCase: jest.fn(),
        inviteAdmin: jest.fn(),
        deactivateAdmin: jest.fn(),
        restoreAdmin: jest.fn(),
        changeAdminRole: jest.fn(),
        changeAdminPermissions: jest.fn(),
        resetAdminPassword: jest.fn(),
      };
      const controller = new AdminV2AdminsController(
        adminsService as never,
        { assertCapability } as never,
        { listSessionsForAdmin, revokeSessionAsManager } as never,
      );
      return { controller, assertCapability, listSessionsForAdmin, revokeSessionAsManager };
    }

    const actor = { id: `admin-1`, email: `admin@example.com`, type: `SUPER`, sessionId: `session-self` } as never;
    const buildReq = () =>
      ({
        ip: `203.0.113.5`,
        headers: { 'user-agent': `jest`, 'idempotency-key': `idem-7` },
      }) as never;

    it(`listAdminSessions: requires admins.read and delegates to sessions service`, async () => {
      const { controller, assertCapability, listSessionsForAdmin } = buildSessionsHarness();
      const result = await controller.listAdminSessions(actor, `admin-2`);
      expect(assertCapability).toHaveBeenCalledWith(actor, `admins.read`);
      expect(listSessionsForAdmin).toHaveBeenCalledWith(`admin-2`);
      expect(result).toEqual({
        sessions: [expect.objectContaining({ id: `session-foo`, revokedAt: null })],
      });
    });

    it(`listAdminSessions: capability denial bubbles up`, async () => {
      const { controller, listSessionsForAdmin } = buildSessionsHarness({
        assertCapabilityImpl: async () => {
          throw new ForbiddenException(`forbidden`);
        },
      });
      await expect(controller.listAdminSessions(actor, `admin-2`)).rejects.toThrow(ForbiddenException);
      expect(listSessionsForAdmin).not.toHaveBeenCalled();
    });

    it(`revokeAdminSession: requires admins.manage and delegates with normalized request meta`, async () => {
      const { controller, assertCapability, revokeSessionAsManager } = buildSessionsHarness();
      const result = await controller.revokeAdminSession(actor, `admin-2`, `session-foo`, buildReq());
      expect(assertCapability).toHaveBeenCalledWith(actor, `admins.manage`);
      expect(revokeSessionAsManager).toHaveBeenCalledWith(`admin-2`, `session-foo`, `admin-1`, {
        ipAddress: `203.0.113.5`,
        userAgent: `jest`,
      });
      expect(result).toEqual({ ok: true, revokedSessionId: `session-foo`, alreadyRevoked: false });
    });

    it(`revokeAdminSession: capability denial bubbles up and skips delegation`, async () => {
      const { controller, revokeSessionAsManager } = buildSessionsHarness({
        assertCapabilityImpl: async () => {
          throw new ForbiddenException(`forbidden`);
        },
      });
      await expect(controller.revokeAdminSession(actor, `admin-2`, `session-foo`, buildReq())).rejects.toThrow(
        ForbiddenException,
      );
      expect(revokeSessionAsManager).not.toHaveBeenCalled();
    });

    it(`revokeAdminSession: rejects self-target with BadRequestException`, async () => {
      const { controller, revokeSessionAsManager } = buildSessionsHarness();
      await expect(controller.revokeAdminSession(actor, `admin-1`, `session-self`, buildReq())).rejects.toThrow(
        BadRequestException,
      );
      expect(revokeSessionAsManager).not.toHaveBeenCalled();
    });
  });
});
