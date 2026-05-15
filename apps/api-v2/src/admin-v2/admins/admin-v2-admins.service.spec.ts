import { AdminV2AdminsService } from './admin-v2-admins.service';

describe(`AdminV2AdminsService`, () => {
  function buildService() {
    const queriesService = {
      listAdmins: jest.fn(),
      getAdminCase: jest.fn(),
    };
    const mutationsService = {
      patchAdminPassword: jest.fn(),
      updateAdminStatus: jest.fn(),
      deactivateAdmin: jest.fn(),
      restoreAdmin: jest.fn(),
      changeAdminRole: jest.fn(),
      changeAdminPermissions: jest.fn(),
    };
    const invitationsService = {
      inviteAdmin: jest.fn(),
      acceptInvitation: jest.fn(),
    };
    const passwordFlowsService = {
      requestPasswordReset: jest.fn(),
      resetAdminPassword: jest.fn(),
      resetPasswordWithToken: jest.fn(),
    };

    return {
      service: new AdminV2AdminsService(
        queriesService as never,
        mutationsService as never,
        invitationsService as never,
        passwordFlowsService as never,
      ),
      queriesService,
      mutationsService,
      invitationsService,
      passwordFlowsService,
    };
  }

  it(`delegates read-side calls to the queries collaborator`, async () => {
    const { service, queriesService } = buildService();
    queriesService.listAdmins.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });
    queriesService.getAdminCase.mockResolvedValueOnce({ id: `admin-1` });

    await expect(service.listAdmins({ q: `ops@example.com` })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    await expect(service.getAdminCase(`admin-1`)).resolves.toEqual({ id: `admin-1` });

    expect(queriesService.listAdmins).toHaveBeenCalledWith({ q: `ops@example.com` });
    expect(queriesService.getAdminCase).toHaveBeenCalledWith(`admin-1`);
  });

  it(`delegates write-side calls to the split mutation, invitation, and password collaborators`, async () => {
    const { service, mutationsService, invitationsService, passwordFlowsService } = buildService();
    mutationsService.changeAdminPermissions.mockResolvedValueOnce({ ok: true });
    invitationsService.inviteAdmin.mockResolvedValueOnce({ invitationId: `inv-1` });
    passwordFlowsService.resetAdminPassword.mockResolvedValueOnce({ adminId: `admin-2` });

    await expect(
      service.changeAdminPermissions(
        `admin-2`,
        `admin-1`,
        { version: 1, capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }] },
        { idempotencyKey: `idem-1` },
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      service.inviteAdmin(
        `admin-1`,
        { email: `invitee@example.com`, roleKey: `OPS_ADMIN` },
        { idempotencyKey: `idem-2` },
      ),
    ).resolves.toEqual({ invitationId: `inv-1` });
    await expect(
      service.resetAdminPassword(`admin-2`, `admin-1`, { version: 2 }, { idempotencyKey: `idem-3` }),
    ).resolves.toEqual({ adminId: `admin-2` });

    expect(mutationsService.changeAdminPermissions).toHaveBeenCalled();
    expect(invitationsService.inviteAdmin).toHaveBeenCalled();
    expect(passwordFlowsService.resetAdminPassword).toHaveBeenCalled();
  });
});
