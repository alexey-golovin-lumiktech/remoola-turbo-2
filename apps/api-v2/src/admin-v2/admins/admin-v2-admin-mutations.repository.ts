import { Injectable } from '@nestjs/common';

import { Prisma, type Prisma as PrismaNamespace } from '@remoola/database-2';

import { type AdminPermissionOverrideMode } from './admin-v2-admins.utils';
import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from '../../admin-auth/admin-auth-session-reasons';
import { PrismaService } from '../../shared/prisma.service';

const passwordPatchSelect = Prisma.validator<PrismaNamespace.AdminModelSelect>()({
  id: true,
  email: true,
  type: true,
  deletedAt: true,
  updatedAt: true,
});

const lifecycleSelect = Prisma.validator<PrismaNamespace.AdminModelSelect>()({
  id: true,
  email: true,
  deletedAt: true,
  updatedAt: true,
});

const roleSelect = Prisma.validator<PrismaNamespace.AdminRoleModelSelect>()({
  id: true,
  key: true,
});

const roleMutationTargetSelect = Prisma.validator<PrismaNamespace.AdminModelSelect>()({
  id: true,
  email: true,
  type: true,
  updatedAt: true,
  deletedAt: true,
  role: {
    select: roleSelect,
  },
});

const permissionMutationTargetSelect = Prisma.validator<PrismaNamespace.AdminModelSelect>()({
  id: true,
  email: true,
  updatedAt: true,
  deletedAt: true,
  permissionOverrides: {
    select: {
      id: true,
      granted: true,
      permissionId: true,
      permission: {
        select: {
          capability: true,
        },
      },
    },
  },
});

@Injectable()
export class AdminV2AdminMutationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  patchAdminPassword(params: { targetAdminId: string; hash: string; salt: string }) {
    const { targetAdminId, hash, salt } = params;
    return this.prisma.adminModel.update({
      where: { id: targetAdminId },
      data: { password: hash, salt },
      select: passwordPatchSelect,
    });
  }

  updateAdminStatus(params: { targetAdminId: string; action: `delete` | `restore` }) {
    const { targetAdminId, action } = params;
    return this.prisma.adminModel.update({
      where: { id: targetAdminId },
      data: {
        deletedAt: action === `delete` ? new Date() : null,
      },
      select: lifecycleSelect,
    });
  }

  getAdminLifecycleTarget(targetAdminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: targetAdminId },
      select: lifecycleSelect,
    });
  }

  getAdminRoleMutationTarget(targetAdminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: targetAdminId },
      select: roleMutationTargetSelect,
    });
  }

  getAdminPermissionMutationTarget(targetAdminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: targetAdminId },
      select: permissionMutationTargetSelect,
    });
  }

  getRoleByKey(roleKey: string) {
    return this.prisma.adminRoleModel.findFirst({
      where: { key: roleKey },
      select: roleSelect,
    });
  }

  listRelevantPermissions(capabilities: string[]) {
    return this.prisma.adminPermissionModel.findMany({
      where: {
        capability: { in: capabilities },
      },
      select: {
        id: true,
        capability: true,
      },
    });
  }

  deactivateAdmin(
    tx: PrismaNamespace.TransactionClient,
    params: { targetId: string; expectedUpdatedAt: Date; deactivatedAt: Date },
  ) {
    return tx.adminModel.updateMany({
      where: {
        id: params.targetId,
        deletedAt: null,
        updatedAt: params.expectedUpdatedAt,
      },
      data: {
        deletedAt: params.deactivatedAt,
      },
    });
  }

  revokeActiveSessions(tx: PrismaNamespace.TransactionClient, adminId: string, revokedAt: Date) {
    return tx.adminAuthSessionModel.updateMany({
      where: {
        adminId,
        revokedAt: null,
      },
      data: {
        revokedAt,
        invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.admin_deactivated,
        lastUsedAt: revokedAt,
      },
    });
  }

  deleteRefreshTokens(tx: PrismaNamespace.TransactionClient, adminId: string) {
    return tx.accessRefreshTokenModel.deleteMany({
      where: {
        identityId: adminId,
      },
    });
  }

  createAuditEntry(
    tx: PrismaNamespace.TransactionClient,
    params: {
      adminId: string;
      action: string;
      resource: string;
      resourceId: string;
      metadata: PrismaNamespace.InputJsonValue;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
  ) {
    return tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  findAdminUpdatedAt(tx: PrismaNamespace.TransactionClient, adminId: string) {
    return tx.adminModel.findUnique({
      where: { id: adminId },
      select: { updatedAt: true },
    });
  }

  findAdminLifecycleResult(tx: PrismaNamespace.TransactionClient, adminId: string) {
    return tx.adminModel.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        id: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  }

  restoreAdmin(tx: PrismaNamespace.TransactionClient, params: { targetId: string; expectedUpdatedAt: Date }) {
    return tx.adminModel.updateMany({
      where: {
        id: params.targetId,
        deletedAt: { not: null },
        updatedAt: params.expectedUpdatedAt,
      },
      data: {
        deletedAt: null,
      },
    });
  }

  changeAdminRole(
    tx: PrismaNamespace.TransactionClient,
    params: {
      targetId: string;
      expectedUpdatedAt: Date;
      nextRoleId: string;
      nextType: PrismaNamespace.AdminModelCreateInput[`type`];
    },
  ) {
    return tx.adminModel.updateMany({
      where: {
        id: params.targetId,
        updatedAt: params.expectedUpdatedAt,
        deletedAt: null,
      },
      data: {
        roleId: params.nextRoleId,
        type: params.nextType,
      },
    });
  }

  findAdminRoleResult(tx: PrismaNamespace.TransactionClient, adminId: string) {
    return tx.adminModel.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        updatedAt: true,
        role: {
          select: {
            key: true,
          },
        },
      },
    });
  }

  replaceAdminPermissionOverrides(
    tx: PrismaNamespace.TransactionClient,
    params: {
      adminId: string;
      touchedPermissionIds: string[];
      normalizedOverrides: Array<{ capability: string; mode: AdminPermissionOverrideMode }>;
      permissionIdByCapability: Map<string, string>;
    },
  ) {
    const explicitOverrides = params.normalizedOverrides.filter((override) => override.mode !== `inherit`);

    return Promise.all([
      tx.adminPermissionOverrideModel.deleteMany({
        where: {
          adminId: params.adminId,
          permissionId: { in: params.touchedPermissionIds },
        },
      }),
      explicitOverrides.length > 0
        ? tx.adminPermissionOverrideModel.createMany({
            data: explicitOverrides.map((override) => ({
              adminId: params.adminId,
              permissionId: params.permissionIdByCapability.get(override.capability)!,
              granted: override.mode === `grant`,
            })),
          })
        : Promise.resolve({ count: 0 }),
    ]);
  }

  touchAdminPermissions(
    tx: PrismaNamespace.TransactionClient,
    params: {
      targetId: string;
      expectedUpdatedAt: Date;
      updatedAt: Date;
    },
  ) {
    return tx.adminModel.updateMany({
      where: {
        id: params.targetId,
        updatedAt: params.expectedUpdatedAt,
      },
      data: {
        updatedAt: params.updatedAt,
      },
    });
  }

  findAdminPermissionResult(tx: PrismaNamespace.TransactionClient, adminId: string) {
    return tx.adminModel.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        updatedAt: true,
        permissionOverrides: {
          select: {
            granted: true,
            permission: {
              select: {
                capability: true,
              },
            },
          },
        },
      },
    });
  }
}
