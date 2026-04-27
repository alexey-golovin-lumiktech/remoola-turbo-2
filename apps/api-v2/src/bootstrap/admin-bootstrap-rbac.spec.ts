import { $Enums } from '@remoola/database-2';

import { resolveBootstrapAdminRoleKey, syncBootstrapAdminSeedAccounts } from './admin-bootstrap-rbac';
import { SUPER_ADMIN_CAPABILITIES } from '../admin-v2/admin-v2-access';
import { AdminV2AccessService } from '../admin-v2/admin-v2-access.service';

describe(`admin bootstrap RBAC`, () => {
  it(`maps bootstrap seed admin types onto deterministic schema roles`, () => {
    expect(resolveBootstrapAdminRoleKey($Enums.AdminType.SUPER)).toBe(`SUPER_ADMIN`);
    expect(resolveBootstrapAdminRoleKey($Enums.AdminType.ADMIN)).toBe(`OPS_ADMIN`);
  });

  it(`fails fast when bootstrap schema roles are missing`, async () => {
    const prisma = {
      adminRoleModel: {
        findMany: jest.fn(async () => []),
      },
      adminModel: {},
    };

    await expect(
      syncBootstrapAdminSeedAccounts({
        prisma: prisma as never,
        admins: [
          {
            type: $Enums.AdminType.SUPER,
            email: `super.admin@wirebill.com`,
            password: `irrelevant`,
          },
        ],
        passwordAdapter: {
          hashPassword: jest.fn(),
          verifyPassword: jest.fn(),
        },
      }),
    ).rejects.toThrow(`Bootstrap seed requires schema admin_role rows: SUPER_ADMIN`);
  });

  it(`repairs seeded super-admin role assignments so schema RBAC takes over`, async () => {
    const state: {
      admin: {
        id: string;
        email: string;
        type: $Enums.AdminType;
        password: string;
        salt: string;
        roleId: string | null;
      };
    } = {
      admin: {
        id: `admin-super`,
        email: `super.admin@wirebill.com`,
        type: $Enums.AdminType.SUPER,
        password: `stored-hash`,
        salt: `stored-salt`,
        roleId: null,
      },
    };

    const prisma = {
      adminRoleModel: {
        findMany: jest.fn(async () => [{ id: `role-super`, key: `SUPER_ADMIN` }]),
      },
      adminModel: {
        findFirst: jest.fn(async () => ({ ...state.admin })),
        create: jest.fn(),
        update: jest.fn(async ({ data }: { data: Partial<typeof state.admin> }) => {
          state.admin = {
            ...state.admin,
            ...data,
          };
          return { ...state.admin };
        }),
      },
    };

    const accessService = new AdminV2AccessService({
      findAdminAccessRecord: jest.fn(async () =>
        state.admin.roleId
          ? {
              roleKey: `SUPER_ADMIN`,
              roleCapabilities: [...SUPER_ADMIN_CAPABILITIES],
              permissionOverrides: [],
            }
          : {
              roleKey: null,
              roleCapabilities: [],
              permissionOverrides: [],
            },
      ),
    } as never);

    const beforeRepair = await accessService.getAccessProfile({
      id: state.admin.id,
      email: state.admin.email,
      type: state.admin.type,
    });

    expect(beforeRepair.source).toBe(`bridge-bootstrap`);
    expect(beforeRepair.bootstrapReason).toBe(`schema_role_missing`);

    const summary = await syncBootstrapAdminSeedAccounts({
      prisma: prisma as never,
      admins: [
        {
          type: $Enums.AdminType.SUPER,
          email: state.admin.email,
          password: `SuperWirebill@Admin123!`,
        },
      ],
      passwordAdapter: {
        hashPassword: jest.fn(),
        verifyPassword: jest.fn(async () => true),
      },
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
      },
    });

    expect(summary.repairedRoleAssignments).toEqual([state.admin.email]);
    expect(state.admin.roleId).toBe(`role-super`);

    const afterRepair = await accessService.getAccessProfile({
      id: state.admin.id,
      email: state.admin.email,
      type: state.admin.type,
    });

    expect(afterRepair.source).toBe(`schema`);
    expect(afterRepair.role).toBe(`SUPER_ADMIN`);
    expect(afterRepair.bootstrapReason).toBeUndefined();
  });

  it(`creates new seeded admins with the resolved schema role id`, async () => {
    const prisma = {
      adminRoleModel: {
        findMany: jest.fn(async () => [{ id: `role-ops`, key: `OPS_ADMIN` }]),
      },
      adminModel: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
        update: jest.fn(),
      },
    };

    const hashPassword = jest.fn(async () => ({ salt: `generated-salt`, hash: `generated-hash` }));

    const summary = await syncBootstrapAdminSeedAccounts({
      prisma: prisma as never,
      admins: [
        {
          type: $Enums.AdminType.ADMIN,
          email: `regular.admin@wirebill.com`,
          password: `RegularWirebill@Admin123!`,
        },
      ],
      passwordAdapter: {
        hashPassword,
        verifyPassword: jest.fn(),
      },
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
      },
    });

    expect(summary.createdCount).toBe(1);
    expect(prisma.adminModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: `regular.admin@wirebill.com`,
        type: $Enums.AdminType.ADMIN,
        roleId: `role-ops`,
        salt: `generated-salt`,
        password: `generated-hash`,
      }),
    });
  });
});
