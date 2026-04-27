import { Logger } from '@nestjs/common';

import { $Enums, type PrismaClient } from '@remoola/database-2';

import { passwordUtils } from '../shared-common';

export type BootstrapAdminSeed = {
  type: $Enums.AdminType;
  email: string;
  password: string;
};

type BootstrapRoleKey = `SUPER_ADMIN` | `OPS_ADMIN`;

type BootstrapAdminRecord = {
  id: string;
  email: string;
  type: $Enums.AdminType;
  password: string;
  salt: string;
  roleId: string | null;
};

type BootstrapRoleRecord = {
  id: string;
  key: string;
};

type BootstrapPasswordAdapter = Pick<typeof passwordUtils, `hashPassword` | `verifyPassword`>;

type BootstrapLogger = Pick<Logger, `log` | `warn`>;

type BootstrapPrisma = Pick<PrismaClient, `adminModel` | `adminRoleModel`>;

export type BootstrapAdminSyncSummary = {
  createdCount: number;
  updatedCount: number;
  repairedRoleAssignments: string[];
};

const DEFAULT_BOOTSTRAP_LOGGER = new Logger(`BootstrapAdminRbac`);

export function resolveBootstrapAdminRoleKey(type: $Enums.AdminType): BootstrapRoleKey {
  if (type === $Enums.AdminType.SUPER) {
    return `SUPER_ADMIN`;
  }
  if (type === $Enums.AdminType.ADMIN) {
    return `OPS_ADMIN`;
  }
  throw new Error(`Unsupported bootstrap admin type: ${type}`);
}

async function loadBootstrapRoleIds(
  prisma: BootstrapPrisma,
  admins: readonly BootstrapAdminSeed[],
): Promise<Map<BootstrapRoleKey, string>> {
  const requiredKeys = [...new Set(admins.map((admin) => resolveBootstrapAdminRoleKey(admin.type)))];
  const roles = (await prisma.adminRoleModel.findMany({
    where: {
      key: {
        in: requiredKeys,
      },
    },
    select: {
      id: true,
      key: true,
    },
  })) as BootstrapRoleRecord[];

  const roleIds = new Map<BootstrapRoleKey, string>();
  for (const role of roles) {
    if (role.key === `SUPER_ADMIN` || role.key === `OPS_ADMIN`) {
      roleIds.set(role.key, role.id);
    }
  }

  const missingKeys = requiredKeys.filter((key) => !roleIds.has(key));
  if (missingKeys.length > 0) {
    throw new Error(`Bootstrap seed requires schema admin_role rows: ${missingKeys.join(`, `)}`);
  }

  return roleIds;
}

export async function syncBootstrapAdminSeedAccounts(params: {
  prisma: BootstrapPrisma;
  admins: readonly BootstrapAdminSeed[];
  passwordAdapter?: BootstrapPasswordAdapter;
  logger?: BootstrapLogger;
}): Promise<BootstrapAdminSyncSummary> {
  const passwordAdapter = params.passwordAdapter ?? passwordUtils;
  const logger = params.logger ?? DEFAULT_BOOTSTRAP_LOGGER;
  const roleIds = await loadBootstrapRoleIds(params.prisma, params.admins);

  const summary: BootstrapAdminSyncSummary = {
    createdCount: 0,
    updatedCount: 0,
    repairedRoleAssignments: [],
  };

  for (const admin of params.admins) {
    const expectedRoleKey = resolveBootstrapAdminRoleKey(admin.type);
    const expectedRoleId = roleIds.get(expectedRoleKey);
    if (!expectedRoleId) {
      throw new Error(`Bootstrap seed could not resolve role id for ${expectedRoleKey}`);
    }

    const dbAdmin = (await params.prisma.adminModel.findFirst({
      where: { email: admin.email },
      select: {
        id: true,
        email: true,
        type: true,
        password: true,
        salt: true,
        roleId: true,
      },
    })) as BootstrapAdminRecord | null;

    if (!dbAdmin) {
      const { salt, hash } = await passwordAdapter.hashPassword(admin.password);
      await params.prisma.adminModel.create({
        data: {
          email: admin.email,
          password: hash,
          salt,
          type: admin.type,
          roleId: expectedRoleId,
        },
      });
      summary.createdCount += 1;
      continue;
    }

    const validPassword = await passwordAdapter.verifyPassword({
      password: admin.password,
      storedHash: dbAdmin.password,
      storedSalt: dbAdmin.salt,
    });

    const nextData: {
      type?: $Enums.AdminType;
      password?: string;
      salt?: string;
      roleId?: string;
    } = {};

    if (dbAdmin.type !== admin.type) {
      nextData.type = admin.type;
    }

    if (!validPassword) {
      const { salt, hash } = await passwordAdapter.hashPassword(admin.password);
      nextData.password = hash;
      nextData.salt = salt;
    }

    if (dbAdmin.roleId !== expectedRoleId) {
      nextData.roleId = expectedRoleId;
      summary.repairedRoleAssignments.push(admin.email);
    }

    if (Object.keys(nextData).length === 0) {
      continue;
    }

    await params.prisma.adminModel.update({
      where: { id: dbAdmin.id },
      data: nextData,
    });
    summary.updatedCount += 1;
  }

  if (summary.repairedRoleAssignments.length > 0) {
    logger.warn(
      `Bootstrap seed repaired admin-v2 role assignments ${JSON.stringify({
        count: summary.repairedRoleAssignments.length,
        emails: summary.repairedRoleAssignments,
      })}`,
    );
  }

  if (summary.createdCount > 0 || summary.updatedCount > 0) {
    logger.log(
      `Bootstrap seed synced admin-v2 RBAC ${JSON.stringify({
        createdCount: summary.createdCount,
        updatedCount: summary.updatedCount,
      })}`,
    );
  }

  return summary;
}
