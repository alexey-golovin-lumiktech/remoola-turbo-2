import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AdminV2AuthController } from './admin-v2-auth.controller';

type ControllerCtorArgs = ConstructorParameters<typeof AdminV2AuthController>;

const buildRequest = () => ({
  ip: `203.0.113.5`,
  headers: {
    origin: `https://admin-v2.example.com`,
    'x-csrf-token': `csrf-token`,
    'user-agent': `jest-test-agent`,
  },
  cookies: {} as Record<string, string>,
});

const buildResponse = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

const buildOriginResolver = () => ({
  resolveAdminRequestOrigin: jest.fn(() => `https://admin-v2.example.com`),
});

const buildAdminsService = () => ({
  acceptInvitation: jest.fn(async () => ({ accepted: true })),
  resetPasswordWithToken: jest.fn(async () => ({ success: true })),
});

const buildAuthService = () => ({
  login: jest.fn(),
  refreshAccess: jest.fn(),
  revokeSessionByRefreshTokenAndAudit: jest.fn(),
  revokeSessionByIdAndAudit: jest.fn(),
});

const buildAuditService = () => ({
  record: jest.fn(async () => undefined),
});

const buildController = (overrides?: {
  authService?: ReturnType<typeof buildAuthService>;
  auditService?: ReturnType<typeof buildAuditService>;
  adminsService?: ReturnType<typeof buildAdminsService>;
  originResolver?: ReturnType<typeof buildOriginResolver>;
}) => {
  const authService = overrides?.authService ?? buildAuthService();
  const auditService = overrides?.auditService ?? buildAuditService();
  const adminsService = overrides?.adminsService ?? buildAdminsService();
  const originResolver = overrides?.originResolver ?? buildOriginResolver();
  const args: ControllerCtorArgs = [
    authService as never,
    originResolver as never,
    adminsService as never,
    auditService as never,
  ];
  return {
    controller: new AdminV2AuthController(...args),
    authService,
    auditService,
    adminsService,
    originResolver,
  };
};

describe(`AdminV2AuthController`, () => {
  it(`delegates invitation acceptance and password reset to the admin-v2 admins service`, async () => {
    const { controller, adminsService } = buildController();

    await controller.acceptInvitation({ token: `invite-token`, password: `VerySecurePass1` });
    await controller.resetPassword({ token: `reset-token`, password: `VerySecurePass1` });

    expect(adminsService.acceptInvitation).toHaveBeenCalledWith({
      token: `invite-token`,
      password: `VerySecurePass1`,
    });
    expect(adminsService.resetPasswordWithToken).toHaveBeenCalledWith({
      token: `reset-token`,
      password: `VerySecurePass1`,
    });
  });

  describe(`revokeSession`, () => {
    const csrfCookieKey = `__Host-admin_csrf_token`;

    const buildRevokeRequest = () => {
      const req = buildRequest();
      req.cookies[csrfCookieKey] = `csrf-token`;
      return req;
    };

    it(`writes admin_session_revoke admin action audit on success (own session)`, async () => {
      const authService = buildAuthService();
      authService.revokeSessionByIdAndAudit.mockResolvedValue({
        revokedSessionId: `session-1`,
        alreadyRevoked: false,
      });
      const { controller, auditService } = buildController({ authService });

      const result = await controller.revokeSession(
        buildRevokeRequest() as never,
        { id: `admin-1`, email: `admin@example.com`, type: `ADMIN`, sessionId: `session-1` },
        buildResponse() as never,
        {},
      );

      expect(authService.revokeSessionByIdAndAudit).toHaveBeenCalledWith(`admin-1`, `session-1`, {
        ipAddress: `203.0.113.5`,
        userAgent: `jest-test-agent`,
      });
      expect(auditService.record).toHaveBeenCalledWith({
        adminId: `admin-1`,
        action: `admin_session_revoke`,
        resource: `admin_auth_session`,
        resourceId: `session-1`,
        metadata: { isOwnSession: true, alreadyRevoked: false },
        ipAddress: `203.0.113.5`,
        userAgent: `jest-test-agent`,
      });
      expect(result).toEqual({ ok: true, revokedSessionId: `session-1`, alreadyRevoked: false });
    });

    it(`does NOT write admin_session_revoke when service throws`, async () => {
      const authService = buildAuthService();
      authService.revokeSessionByIdAndAudit.mockRejectedValue(new BadRequestException(`ADMIN_NO_IDENTITY_RECORD`));
      const { controller, auditService } = buildController({ authService });

      await expect(
        controller.revokeSession(
          buildRevokeRequest() as never,
          { id: `admin-1`, email: `admin@example.com`, type: `ADMIN`, sessionId: `session-1` },
          buildResponse() as never,
          {},
        ),
      ).rejects.toThrow(BadRequestException);

      expect(auditService.record).not.toHaveBeenCalled();
    });

    it(`writes admin_session_revoke with alreadyRevoked=true on idempotent path`, async () => {
      const authService = buildAuthService();
      authService.revokeSessionByIdAndAudit.mockResolvedValue({
        revokedSessionId: `session-1`,
        alreadyRevoked: true,
      });
      const { controller, auditService } = buildController({ authService });

      await controller.revokeSession(
        buildRevokeRequest() as never,
        { id: `admin-1`, email: `admin@example.com`, type: `ADMIN`, sessionId: `session-1` },
        buildResponse() as never,
        {},
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: `admin_session_revoke`,
          metadata: { isOwnSession: true, alreadyRevoked: true },
        }),
      );
    });

    it(`writes admin_session_revoke with isOwnSession=false on cross-session revoke`, async () => {
      const authService = buildAuthService();
      authService.revokeSessionByIdAndAudit.mockResolvedValue({
        revokedSessionId: `session-other`,
        alreadyRevoked: false,
      });
      const { controller, auditService } = buildController({ authService });

      await controller.revokeSession(
        buildRevokeRequest() as never,
        { id: `admin-1`, email: `admin@example.com`, type: `ADMIN`, sessionId: `session-1` },
        buildResponse() as never,
        { sessionId: `session-other` },
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: `session-other`,
          metadata: { isOwnSession: false, alreadyRevoked: false },
        }),
      );
    });

    it(`throws and does not call service when no session identifier resolves`, async () => {
      const authService = buildAuthService();
      const { controller, auditService } = buildController({ authService });

      await expect(
        controller.revokeSession(
          buildRevokeRequest() as never,
          { id: `admin-1`, email: `admin@example.com`, type: `ADMIN` },
          buildResponse() as never,
          {},
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.revokeSessionByIdAndAudit).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });
});
