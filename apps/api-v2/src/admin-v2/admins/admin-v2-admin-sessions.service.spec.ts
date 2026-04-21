import { BadRequestException } from '@nestjs/common';

import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';

describe(`AdminV2AdminSessionsService`, () => {
  function buildHarness(opts?: {
    targetAdminExists?: boolean;
    targetSessionExists?: boolean;
    revokeResult?: { revokedSessionId: string; alreadyRevoked: boolean };
    sessions?: unknown[];
  }) {
    const adminFindFirst = jest.fn(async () => (opts?.targetAdminExists === false ? null : { id: `admin-2` }));
    const sessionFindFirst = jest.fn(async () => (opts?.targetSessionExists === false ? null : { id: `session-2` }));
    const prisma = {
      adminModel: { findFirst: adminFindFirst },
      adminAuthSessionModel: { findFirst: sessionFindFirst },
    };
    const listSessionsForAdmin = jest.fn(async () => opts?.sessions ?? []);
    const revokeSessionByIdAndAudit = jest.fn(
      async () => opts?.revokeResult ?? { revokedSessionId: `session-2`, alreadyRevoked: false },
    );
    const adminAuthService = { listSessionsForAdmin, revokeSessionByIdAndAudit };
    const recordAudit = jest.fn(async () => undefined);
    const adminActionAudit = { record: recordAudit };
    const service = new AdminV2AdminSessionsService(
      prisma as never,
      adminAuthService as never,
      adminActionAudit as never,
    );
    return {
      service,
      prisma,
      listSessionsForAdmin,
      revokeSessionByIdAndAudit,
      recordAudit,
      adminFindFirst,
      sessionFindFirst,
    };
  }

  describe(`listSessionsForAdmin`, () => {
    it(`looks up the admin and delegates to AdminAuthService.listSessionsForAdmin`, async () => {
      const { service, listSessionsForAdmin, adminFindFirst } = buildHarness({
        sessions: [{ id: `session-2`, sessionFamilyId: `family-2` }],
      });
      const result = await service.listSessionsForAdmin(`admin-2`);
      expect(adminFindFirst).toHaveBeenCalledWith({
        where: { id: `admin-2`, deletedAt: null },
        select: { id: true },
      });
      expect(listSessionsForAdmin).toHaveBeenCalledWith(`admin-2`);
      expect(result).toEqual({ sessions: [{ id: `session-2`, sessionFamilyId: `family-2` }] });
    });

    it(`throws BadRequestException when admin is not found`, async () => {
      const { service } = buildHarness({ targetAdminExists: false });
      await expect(service.listSessionsForAdmin(`missing`)).rejects.toThrow(BadRequestException);
    });
  });

  describe(`revokeSessionAsManager`, () => {
    const ctx = { ipAddress: `203.0.113.5`, userAgent: `jest` };

    it(`writes cross_admin_revoked reason and dual-audit on happy path`, async () => {
      const { service, revokeSessionByIdAndAudit, recordAudit } = buildHarness();
      const result = await service.revokeSessionAsManager(`admin-2`, `session-2`, `admin-1`, ctx);
      expect(revokeSessionByIdAndAudit).toHaveBeenCalledWith(`admin-2`, `session-2`, {
        ipAddress: `203.0.113.5`,
        userAgent: `jest`,
        reason: `cross_admin_revoked`,
      });
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: `admin-1`,
          action: `admin_session_revoke_other`,
          resource: `admin_auth_session`,
          resourceId: `session-2`,
          metadata: { targetAdminId: `admin-2`, alreadyRevoked: false },
        }),
      );
      expect(result).toEqual({ ok: true, revokedSessionId: `session-2`, alreadyRevoked: false });
    });

    it(`rejects self-target with BadRequestException`, async () => {
      const { service, revokeSessionByIdAndAudit, recordAudit } = buildHarness();
      await expect(service.revokeSessionAsManager(`admin-1`, `session-x`, `admin-1`, ctx)).rejects.toThrow(
        BadRequestException,
      );
      expect(revokeSessionByIdAndAudit).not.toHaveBeenCalled();
      expect(recordAudit).not.toHaveBeenCalled();
    });

    it(`throws when target session does not exist for the target admin`, async () => {
      const { service, revokeSessionByIdAndAudit, recordAudit } = buildHarness({ targetSessionExists: false });
      await expect(service.revokeSessionAsManager(`admin-2`, `missing`, `admin-1`, ctx)).rejects.toThrow(
        BadRequestException,
      );
      expect(revokeSessionByIdAndAudit).not.toHaveBeenCalled();
      expect(recordAudit).not.toHaveBeenCalled();
    });

    it(`forwards alreadyRevoked: true into the admin action audit metadata`, async () => {
      const { service, recordAudit } = buildHarness({
        revokeResult: { revokedSessionId: `session-2`, alreadyRevoked: true },
      });
      const result = await service.revokeSessionAsManager(`admin-2`, `session-2`, `admin-1`, ctx);
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { targetAdminId: `admin-2`, alreadyRevoked: true },
        }),
      );
      expect(result.alreadyRevoked).toBe(true);
    });
  });
});
