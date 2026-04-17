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
});
