import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from '../../admin-auth/admin-auth-session-reasons';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { hashPassword } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import {
  ADMIN_PERMISSION_OVERRIDE_CAPABILITIES,
  ADMIN_PERMISSION_OVERRIDE_MODES,
  ALLOWED_ROLE_KEYS,
  type AdminPermissionOverrideMode,
  type RequestMeta,
  buildStaleVersionPayload,
  deriveStatus,
  deriveVersion,
  normalizeReason,
  toAdminType,
  toNullableIso,
  toPermissionOverrideGrant,
} from './admin-v2-admins.utils';

@Injectable()
export class AdminV2AdminMutationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly auditTrail: AdminV2AdminAuditTrail,
  ) {}

  async patchAdminPassword(targetAdminId: string, password: string, actorAdminId: string, meta: RequestMeta) {
    const { hash, salt } = await hashPassword(password);
    const updated = await this.prisma.adminModel.update({
      where: { id: targetAdminId },
      data: { password: hash, salt },
      select: {
        id: true,
        email: true,
        type: true,
        deletedAt: true,
        updatedAt: true,
      },
    });

    await this.auditTrail.recordAdminActionAudit({
      adminId: actorAdminId,
      action: ADMIN_ACTION_AUDIT_ACTIONS.admin_password_change,
      resourceId: updated.id,
      metadata: {
        targetEmail: updated.email,
      },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return {
      adminId: updated.id,
      email: updated.email,
      type: updated.type,
      status: deriveStatus(updated.deletedAt),
      version: deriveVersion(updated.updatedAt),
    };
  }

  async updateAdminStatus(
    targetAdminId: string,
    action: `delete` | `restore`,
    actorAdminId: string,
    meta: RequestMeta,
  ) {
    const updated = await this.prisma.adminModel.update({
      where: { id: targetAdminId },
      data: {
        deletedAt: action === `delete` ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        deletedAt: true,
        updatedAt: true,
      },
    });

    await this.auditTrail.recordAdminActionAudit({
      adminId: actorAdminId,
      action: action === `delete` ? ADMIN_ACTION_AUDIT_ACTIONS.admin_delete : ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
      resourceId: updated.id,
      metadata: {
        targetEmail: updated.email,
      },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return {
      adminId: updated.id,
      status: deriveStatus(updated.deletedAt),
      deletedAt: toNullableIso(updated.deletedAt),
      version: deriveVersion(updated.updatedAt),
    };
  }

  async deactivateAdmin(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; reason?: string | null },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for admin deactivation`);
    }
    if (targetAdminId === actorAdminId) {
      throw new ConflictException(`You cannot deactivate your own admin account`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }
    const reason = normalizeReason(body.reason);

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-deactivate:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        confirmed: true,
        reason,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            deletedAt: true,
            updatedAt: true,
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          return {
            adminId: target.id,
            status: `INACTIVE`,
            deletedAt: target.deletedAt.toISOString(),
            version: deriveVersion(target.updatedAt),
            alreadyInactive: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const deactivatedAt = new Date();
          const updated = await tx.adminModel.updateMany({
            where: {
              id: target.id,
              deletedAt: null,
              updatedAt: target.updatedAt,
            },
            data: {
              deletedAt: deactivatedAt,
            },
          });
          if (updated.count === 0) {
            const current = await tx.adminModel.findUnique({
              where: { id: target.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
          }
          await tx.adminAuthSessionModel.updateMany({
            where: {
              adminId: target.id,
              revokedAt: null,
            },
            data: {
              revokedAt: deactivatedAt,
              invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.admin_deactivated,
              lastUsedAt: deactivatedAt,
            },
          });
          await tx.accessRefreshTokenModel.deleteMany({
            where: {
              identityId: target.id,
            },
          });
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_deactivate,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                confirmed: true,
                reason,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              id: true,
              updatedAt: true,
              deletedAt: true,
            },
          });
          return {
            adminId: fresh.id,
            status: `INACTIVE`,
            deletedAt: fresh.deletedAt?.toISOString() ?? deactivatedAt.toISOString(),
            version: deriveVersion(fresh.updatedAt),
            alreadyInactive: false,
          };
        });
      },
    });
  }

  async restoreAdmin(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-restore:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: { targetAdminId, expectedVersion },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            deletedAt: true,
            updatedAt: true,
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (!target.deletedAt) {
          return {
            adminId: target.id,
            status: `ACTIVE`,
            version: deriveVersion(target.updatedAt),
            alreadyActive: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const updated = await tx.adminModel.updateMany({
            where: {
              id: target.id,
              deletedAt: { not: null },
              updatedAt: target.updatedAt,
            },
            data: {
              deletedAt: null,
            },
          });
          if (updated.count === 0) {
            const current = await tx.adminModel.findUnique({
              where: { id: target.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
          }
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              id: true,
              updatedAt: true,
              deletedAt: true,
            },
          });
          return {
            adminId: fresh.id,
            status: `ACTIVE`,
            deletedAt: toNullableIso(fresh.deletedAt),
            version: deriveVersion(fresh.updatedAt),
            alreadyActive: false,
          };
        });
      },
    });
  }

  async changeAdminRole(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; roleKey?: string },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for admin role change`);
    }
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }
    const nextRoleKey = String(body.roleKey ?? ``).trim();
    if (!ALLOWED_ROLE_KEYS.has(nextRoleKey)) {
      throw new BadRequestException(`Unsupported admin role`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-role-change:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        confirmed: true,
        nextRoleKey,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            type: true,
            updatedAt: true,
            deletedAt: true,
            role: {
              select: {
                id: true,
                key: true,
              },
            },
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          throw new ConflictException(`Inactive admins cannot change roles until restored`);
        }
        if (target.role?.key === nextRoleKey) {
          return {
            adminId: target.id,
            roleKey: nextRoleKey,
            version: deriveVersion(target.updatedAt),
            alreadyApplied: true,
          };
        }

        const nextRole = await this.prisma.adminRoleModel.findFirst({
          where: { key: nextRoleKey },
          select: { id: true, key: true },
        });
        if (!nextRole) {
          throw new BadRequestException(`Target role is unavailable`);
        }

        return this.prisma.$transaction(async (tx) => {
          const updated = await tx.adminModel.updateMany({
            where: {
              id: target.id,
              updatedAt: target.updatedAt,
              deletedAt: null,
            },
            data: {
              roleId: nextRole.id,
              type: toAdminType(nextRole.key),
            },
          });
          if (updated.count === 0) {
            const current = await tx.adminModel.findUnique({
              where: { id: target.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
          }
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_role_change,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                confirmed: true,
                previousRoleKey: target.role?.key ?? null,
                nextRoleKey,
                previousType: target.type,
                nextType: toAdminType(nextRole.key),
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              updatedAt: true,
              role: {
                select: {
                  key: true,
                },
              },
            },
          });
          return {
            adminId: target.id,
            roleKey: fresh.role?.key ?? nextRoleKey,
            version: deriveVersion(fresh.updatedAt),
            alreadyApplied: false,
          };
        });
      },
    });
  }

  async changeAdminPermissions(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; capabilityOverrides?: Array<{ capability: string; mode: string }> },
    meta: RequestMeta,
  ) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }
    const requestedOverrides = Array.isArray(body.capabilityOverrides) ? body.capabilityOverrides : [];
    const normalizedOverrides = requestedOverrides.map((override) => {
      const capability = String(override.capability ?? ``).trim();
      const mode = String(override.mode ?? ``).trim() as AdminPermissionOverrideMode;
      return {
        capability,
        mode,
      };
    });
    if (
      normalizedOverrides.some(
        (override) =>
          !override.capability ||
          !ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.capability) ||
          !ADMIN_PERMISSION_OVERRIDE_MODES.has(override.mode),
      )
    ) {
      throw new BadRequestException(`Only known admin-v2 capability overrides are supported`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-permissions-change:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        normalizedOverrides,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
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
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          throw new ConflictException(`Inactive admins cannot change permission overrides until restored`);
        }

        const relevantPermissions = await this.prisma.adminPermissionModel.findMany({
          where: {
            capability: { in: [...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES] },
          },
          select: {
            id: true,
            capability: true,
          },
        });
        const permissionIdByCapability = new Map(
          relevantPermissions.map((permission) => [permission.capability, permission.id]),
        );
        if (normalizedOverrides.some((override) => !permissionIdByCapability.has(override.capability))) {
          throw new BadRequestException(`One or more requested capabilities are unavailable`);
        }

        const currentOverrideMap = new Map(
          target.permissionOverrides
            .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
            .map((override) => [override.permission.capability, override.granted]),
        );
        const nextOverrideMap = new Map<string, boolean | null>();
        for (const override of normalizedOverrides) {
          nextOverrideMap.set(override.capability, toPermissionOverrideGrant(override.mode));
        }
        const changes = [...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES].flatMap((capability) => {
          const current = currentOverrideMap.has(capability) ? currentOverrideMap.get(capability)! : null;
          const next = nextOverrideMap.has(capability) ? nextOverrideMap.get(capability)! : null;
          return current === next ? [] : [{ capability, previous: current, next }];
        });
        if (changes.length === 0) {
          return {
            adminId: target.id,
            version: deriveVersion(target.updatedAt),
            overrides: normalizedOverrides,
            alreadyApplied: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const touchedPermissionIds = [
            ...new Set(normalizedOverrides.map((override) => permissionIdByCapability.get(override.capability)!)),
          ];
          await tx.adminPermissionOverrideModel.deleteMany({
            where: {
              adminId: target.id,
              permissionId: { in: touchedPermissionIds },
            },
          });
          const explicitOverrides = normalizedOverrides.filter((override) => override.mode !== `inherit`);
          if (explicitOverrides.length > 0) {
            await tx.adminPermissionOverrideModel.createMany({
              data: explicitOverrides.map((override) => ({
                adminId: target.id,
                permissionId: permissionIdByCapability.get(override.capability)!,
                granted: override.mode === `grant`,
              })),
            });
          }

          await tx.adminModel.updateMany({
            where: {
              id: target.id,
              updatedAt: target.updatedAt,
            },
            data: {
              updatedAt: new Date(),
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_permissions_change,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                changes,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
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
          return {
            adminId: target.id,
            version: deriveVersion(fresh.updatedAt),
            overrides: fresh.permissionOverrides
              .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
              .map((override) => ({
                capability: override.permission.capability,
                granted: override.granted,
              })),
            alreadyApplied: false,
          };
        });
      },
    });
  }
}
