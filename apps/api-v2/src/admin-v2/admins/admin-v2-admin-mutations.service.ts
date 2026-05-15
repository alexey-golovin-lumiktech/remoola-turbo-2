import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { hashPassword } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
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
    private readonly repository: AdminV2AdminMutationsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly auditTrail: AdminV2AdminAuditTrail,
  ) {}

  async patchAdminPassword(targetAdminId: string, password: string, actorAdminId: string, meta: RequestMeta) {
    const { hash, salt } = await hashPassword(password);
    const updated = await this.repository.patchAdminPassword({ targetAdminId, hash, salt });

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
    const updated = await this.repository.updateAdminStatus({ targetAdminId, action });

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

    return this.idempotency.executeInTransaction({
      adminId: actorAdminId,
      scope: `admin-deactivate:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        confirmed: true,
        reason,
      },
      execute: async (tx) => {
        const target = await this.repository.getAdminLifecycleTarget(targetAdminId);
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

        const deactivatedAt = new Date();

        const updated = await this.repository.deactivateAdmin(tx, {
          targetId: target.id,
          expectedUpdatedAt: target.updatedAt,
          deactivatedAt,
        });
        if (updated.count === 0) {
          const current = await this.repository.findAdminUpdatedAt(tx, target.id);
          throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
        }

        await this.repository.revokeActiveSessions(tx, target.id, deactivatedAt);
        await this.repository.deleteRefreshTokens(tx, target.id);
        await this.repository.createAuditEntry(tx, {
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
        });

        const fresh = await this.repository.findAdminLifecycleResult(tx, target.id);
        return {
          adminId: fresh.id,
          status: `INACTIVE` as const,
          deletedAt: fresh.deletedAt?.toISOString() ?? deactivatedAt.toISOString(),
          version: deriveVersion(fresh.updatedAt),
          alreadyInactive: false,
        };
      },
    });
  }

  async restoreAdmin(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.executeInTransaction({
      adminId: actorAdminId,
      scope: `admin-restore:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: { targetAdminId, expectedVersion },
      execute: async (tx) => {
        const target = await this.repository.getAdminLifecycleTarget(targetAdminId);
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

        const updated = await this.repository.restoreAdmin(tx, {
          targetId: target.id,
          expectedUpdatedAt: target.updatedAt,
        });
        if (updated.count === 0) {
          const current = await this.repository.findAdminUpdatedAt(tx, target.id);
          throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
        }

        await this.repository.createAuditEntry(tx, {
          adminId: actorAdminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
          resource: `admin`,
          resourceId: target.id,
          metadata: {
            targetEmail: target.email,
          },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        const fresh = await this.repository.findAdminLifecycleResult(tx, target.id);
        return {
          adminId: fresh.id,
          status: `ACTIVE` as const,
          deletedAt: toNullableIso(fresh.deletedAt),
          version: deriveVersion(fresh.updatedAt),
          alreadyActive: false,
        };
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

    return this.idempotency.executeInTransaction({
      adminId: actorAdminId,
      scope: `admin-role-change:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        confirmed: true,
        nextRoleKey,
      },
      execute: async (tx) => {
        const target = await this.repository.getAdminRoleMutationTarget(targetAdminId);
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

        const nextRole = await this.repository.getRoleByKey(nextRoleKey);
        if (!nextRole) {
          throw new BadRequestException(`Target role is unavailable`);
        }

        const updated = await this.repository.changeAdminRole(tx, {
          targetId: target.id,
          expectedUpdatedAt: target.updatedAt,
          nextRoleId: nextRole.id,
          nextType: toAdminType(nextRole.key),
        });
        if (updated.count === 0) {
          const current = await this.repository.findAdminUpdatedAt(tx, target.id);
          throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
        }

        await this.repository.createAuditEntry(tx, {
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
        });

        const fresh = await this.repository.findAdminRoleResult(tx, target.id);
        return {
          adminId: target.id,
          roleKey: fresh.role?.key ?? nextRoleKey,
          version: deriveVersion(fresh.updatedAt),
          alreadyApplied: false,
        };
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

    return this.idempotency.executeInTransaction({
      adminId: actorAdminId,
      scope: `admin-permissions-change:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        normalizedOverrides,
      },
      execute: async (tx) => {
        const target = await this.repository.getAdminPermissionMutationTarget(targetAdminId);
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          throw new ConflictException(`Inactive admins cannot change permission overrides until restored`);
        }

        const relevantPermissions = await this.repository.listRelevantPermissions([
          ...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES,
        ]);
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

        await this.repository.replaceAdminPermissionOverrides(tx, {
          adminId: target.id,
          normalizedOverrides,
          touchedPermissionIds: [
            ...new Set(normalizedOverrides.map((override) => permissionIdByCapability.get(override.capability)!)),
          ],
          permissionIdByCapability,
        });

        const updatedAt = new Date();
        const updated = await this.repository.touchAdminPermissions(tx, {
          targetId: target.id,
          expectedUpdatedAt: target.updatedAt,
          updatedAt,
        });
        if (updated.count === 0) {
          const current = await this.repository.findAdminUpdatedAt(tx, target.id);
          throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
        }

        await this.repository.createAuditEntry(tx, {
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
        });

        const fresh = await this.repository.findAdminPermissionResult(tx, target.id);
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
      },
    });
  }
}
