import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { AdminV2AdminsController } from './admin-v2-admins.controller';

describe(`AdminV2AdminsController`, () => {
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
