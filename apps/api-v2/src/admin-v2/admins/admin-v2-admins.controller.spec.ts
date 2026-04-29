import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

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
        patchAdminPassword: jest.fn(),
        updateAdminStatus: jest.fn(),
      };
      const verifyStepUp = jest.fn(async () => undefined);
      const controller = new AdminV2AdminsController(
        adminsService as never,
        { assertCapability } as never,
        { listSessionsForAdmin, revokeSessionAsManager } as never,
        { verifyStepUp } as never,
      );
      return {
        controller,
        assertCapability,
        listSessionsForAdmin,
        revokeSessionAsManager,
        adminsService,
        verifyStepUp,
      };
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

    it(`patchAdminPassword: verifies step-up and delegates`, async () => {
      const { controller, assertCapability, adminsService, verifyStepUp } = buildSessionsHarness();
      adminsService.patchAdminPassword.mockResolvedValue({ adminId: `admin-2` });

      const result = await controller.patchAdminPassword(
        actor,
        `admin-2`,
        { password: `NewValid1!@#abc`, passwordConfirmation: `Current1!@#abc` } as never,
        buildReq(),
      );

      expect(assertCapability).toHaveBeenCalledWith(actor, `admins.manage`);
      expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
      expect(adminsService.patchAdminPassword).toHaveBeenCalledWith(
        `admin-2`,
        `NewValid1!@#abc`,
        `admin-1`,
        expect.objectContaining({ ipAddress: `203.0.113.5`, userAgent: `jest`, idempotencyKey: `idem-7` }),
      );
      expect(result).toEqual({ adminId: `admin-2` });
    });

    it(`patchAdminPassword: bubbles up invalid password confirmation and skips delegation`, async () => {
      const { controller, adminsService, verifyStepUp } = buildSessionsHarness();
      verifyStepUp.mockRejectedValueOnce(new UnauthorizedException(`invalid`));

      await expect(
        controller.patchAdminPassword(
          actor,
          `admin-2`,
          { password: `NewValid1!@#abc`, passwordConfirmation: `WrongPassword1!@#` } as never,
          buildReq(),
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(adminsService.patchAdminPassword).not.toHaveBeenCalled();
    });

    it(`inviteAdmin: verifies step-up before inviting`, async () => {
      const { controller, adminsService, verifyStepUp } = buildSessionsHarness();
      adminsService.inviteAdmin.mockResolvedValue({ invitationId: `inv-1` });

      await expect(
        controller.inviteAdmin(
          actor,
          { email: `new-admin@example.com`, roleKey: `OPS_ADMIN`, passwordConfirmation: `Current1!@#abc` } as never,
          buildReq(),
        ),
      ).resolves.toEqual({ invitationId: `inv-1` });

      expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
      expect(adminsService.inviteAdmin).toHaveBeenCalledWith(
        `admin-1`,
        expect.objectContaining({ email: `new-admin@example.com`, roleKey: `OPS_ADMIN` }),
        expect.objectContaining({ idempotencyKey: `idem-7` }),
      );
    });

    it.each([
      [
        `deactivateAdmin`,
        (controller: AdminV2AdminsController) =>
          controller.deactivateAdmin(
            actor,
            `admin-2`,
            { version: 1, confirmed: true, passwordConfirmation: `Current1!@#abc` } as never,
            buildReq(),
          ),
        `deactivateAdmin`,
      ],
      [
        `restoreAdmin`,
        (controller: AdminV2AdminsController) =>
          controller.restoreAdmin(
            actor,
            `admin-2`,
            { version: 1, passwordConfirmation: `Current1!@#abc` } as never,
            buildReq(),
          ),
        `restoreAdmin`,
      ],
      [
        `changeAdminRole`,
        (controller: AdminV2AdminsController) =>
          controller.changeAdminRole(
            actor,
            `admin-2`,
            { version: 1, confirmed: true, roleKey: `OPS_ADMIN`, passwordConfirmation: `Current1!@#abc` } as never,
            buildReq(),
          ),
        `changeAdminRole`,
      ],
      [
        `changeAdminPermissions`,
        (controller: AdminV2AdminsController) =>
          controller.changeAdminPermissions(
            actor,
            `admin-2`,
            {
              version: 1,
              capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
              passwordConfirmation: `Current1!@#abc`,
            } as never,
            buildReq(),
          ),
        `changeAdminPermissions`,
      ],
      [
        `resetAdminPassword`,
        (controller: AdminV2AdminsController) =>
          controller.resetAdminPassword(
            actor,
            `admin-2`,
            { version: 1, passwordConfirmation: `Current1!@#abc` } as never,
            buildReq(),
          ),
        `resetAdminPassword`,
      ],
    ])(`%s: verifies step-up before delegation`, async (_name, callEndpoint, serviceMethod) => {
      const { controller, adminsService, verifyStepUp } = buildSessionsHarness();
      adminsService[serviceMethod as keyof typeof adminsService].mockResolvedValue({ ok: true });

      await expect(callEndpoint(controller)).resolves.toEqual({ ok: true });

      expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
      expect(adminsService[serviceMethod as keyof typeof adminsService]).toHaveBeenCalled();
    });

    it(`updateAdminStatus: requires delete confirmation password`, async () => {
      const { controller, adminsService, verifyStepUp } = buildSessionsHarness();

      await expect(
        controller.updateAdminStatus(actor, `admin-2`, { action: `delete` } as never, buildReq()),
      ).rejects.toThrow(BadRequestException);

      expect(verifyStepUp).not.toHaveBeenCalled();
      expect(adminsService.updateAdminStatus).not.toHaveBeenCalled();
    });

    it(`updateAdminStatus: trims delete confirmation before step-up verification`, async () => {
      const { controller, adminsService, verifyStepUp } = buildSessionsHarness();
      adminsService.updateAdminStatus.mockResolvedValue({ ok: true });

      await expect(
        controller.updateAdminStatus(
          actor,
          `admin-2`,
          { action: `delete`, passwordConfirmation: `  Current1!@#abc  ` } as never,
          buildReq(),
        ),
      ).resolves.toEqual({ ok: true });

      expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
      expect(adminsService.updateAdminStatus).toHaveBeenCalledWith(
        `admin-2`,
        `delete`,
        `admin-1`,
        expect.objectContaining({ idempotencyKey: `idem-7` }),
      );
    });

    it(`updateAdminStatus: bubbles up invalid delete confirmation and skips delegation`, async () => {
      const { controller, adminsService, verifyStepUp } = buildSessionsHarness();
      verifyStepUp.mockRejectedValueOnce(new UnauthorizedException(`invalid`));

      await expect(
        controller.updateAdminStatus(
          actor,
          `admin-2`,
          { action: `delete`, passwordConfirmation: `WrongPassword1!@#` } as never,
          buildReq(),
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(adminsService.updateAdminStatus).not.toHaveBeenCalled();
    });
  });
});
