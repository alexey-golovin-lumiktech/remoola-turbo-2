import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { type AdminV2AdminSessionsQuery } from './admin-v2-admin-sessions.query';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';

describe(`AdminV2AdminSessionsService`, () => {
  function buildHarness(opts?: {
    targetAdminExists?: boolean;
    targetSessionExists?: boolean;
    revokeResult?: { revokedSessionId: string; alreadyRevoked: boolean };
    sessions?: unknown[];
  }) {
    const findActiveAdminId = jest.fn<(...a: any[]) => any>(async () =>
      opts?.targetAdminExists === false ? null : { id: `admin-2` },
    );
    const findOwnedSessionId = jest.fn<(...a: any[]) => any>(async () =>
      opts?.targetSessionExists === false ? null : { id: `session-2` },
    );
    const query = {
      findActiveAdminId,
      findOwnedSessionId,
    };
    const listSessionsForAdmin = jest.fn<(...a: any[]) => any>(async () => opts?.sessions ?? []);
    const revokeSessionByIdAndAudit = jest.fn<(...a: any[]) => any>(
      async () => opts?.revokeResult ?? { revokedSessionId: `session-2`, alreadyRevoked: false },
    );
    const adminAuthService = { listSessionsForAdmin, revokeSessionByIdAndAudit };
    const recordAudit = jest.fn<(...a: any[]) => any>(async () => undefined);
    const adminActionAudit = { record: recordAudit };
    const service = new AdminV2AdminSessionsService(
      query as unknown as AdminV2AdminSessionsQuery,
      adminAuthService as never,
      adminActionAudit as never,
    );
    return {
      service,
      query,
      listSessionsForAdmin,
      revokeSessionByIdAndAudit,
      recordAudit,
      findActiveAdminId,
      findOwnedSessionId,
    };
  }

  describe(`listSessionsForAdmin`, () => {
    it(`looks up the admin and delegates to AdminAuthService.listSessionsForAdmin`, async () => {
      const { service, listSessionsForAdmin, findActiveAdminId } = buildHarness({
        sessions: [{ id: `session-2`, sessionFamilyId: `family-2` }],
      });
      const result = await service.listSessionsForAdmin(`admin-2`);
      expect(findActiveAdminId).toHaveBeenCalledWith(`admin-2`);
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
      const { service, revokeSessionByIdAndAudit, recordAudit, findOwnedSessionId } = buildHarness({
        targetSessionExists: false,
      });
      await expect(service.revokeSessionAsManager(`admin-2`, `missing`, `admin-1`, ctx)).rejects.toThrow(
        BadRequestException,
      );
      expect(findOwnedSessionId).toHaveBeenCalledWith({ adminId: `admin-2`, sessionId: `missing` });
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
