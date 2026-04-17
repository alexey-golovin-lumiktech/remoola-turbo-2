import { AdminV2AuthController } from './admin-v2-auth.controller';

describe(`AdminV2AuthController`, () => {
  it(`delegates invitation acceptance and password reset to the admin-v2 admins service`, async () => {
    const acceptInvitation = jest.fn(async () => ({ accepted: true }));
    const resetPasswordWithToken = jest.fn(async () => ({ success: true }));
    const controller = new AdminV2AuthController(
      {
        login: jest.fn(),
        refreshAccess: jest.fn(),
        revokeSessionByRefreshTokenAndAudit: jest.fn(),
        revokeSessionByIdAndAudit: jest.fn(),
      } as never,
      {
        resolveAdminRequestOrigin: jest.fn(() => `https://admin-v2.example.com`),
      } as never,
      {
        acceptInvitation,
        resetPasswordWithToken,
      } as never,
    );

    await controller.acceptInvitation({ token: `invite-token`, password: `VerySecurePass1` });
    await controller.resetPassword({ token: `reset-token`, password: `VerySecurePass1` });

    expect(acceptInvitation).toHaveBeenCalledWith({ token: `invite-token`, password: `VerySecurePass1` });
    expect(resetPasswordWithToken).toHaveBeenCalledWith({ token: `reset-token`, password: `VerySecurePass1` });
  });
});
