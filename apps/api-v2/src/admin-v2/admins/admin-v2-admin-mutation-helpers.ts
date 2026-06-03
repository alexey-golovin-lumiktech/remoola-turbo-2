import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import {
  ADMIN_PERMISSION_OVERRIDE_CAPABILITIES,
  ADMIN_PERMISSION_OVERRIDE_MODES,
  ALLOWED_ROLE_KEYS,
  type AdminPermissionOverrideMode,
  type RequestMeta,
  buildStaleVersionPayload,
  deriveStatus,
  deriveVersion,
  toAdminType,
  toNullableIso,
  toPermissionOverrideGrant,
} from './admin-v2-admins.utils';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';

type LifecycleTarget = {
  id: string;
  email: string;
  updatedAt: Date;
  deletedAt: Date | null;
};

type FreshLifecycleResult = {
  id: string;
  updatedAt: Date;
  deletedAt: Date | null | undefined;
};

type RoleTarget = LifecycleTarget & {
  type: string;
  role?: { key: string | null } | null;
};

type RoleRecord = {
  id: string;
  key: string;
};

type FreshRoleResult = {
  updatedAt: Date;
  role?: { key: string | null } | null;
};

type PermissionOverrideRecord = {
  granted: boolean | null;
  permission: { capability: string };
};

type PermissionTarget = LifecycleTarget & {
  permissionOverrides: PermissionOverrideRecord[];
};

type FreshPermissionResult = {
  updatedAt: Date;
  permissionOverrides: PermissionOverrideRecord[];
};

type PermissionRecord = {
  id: string;
  capability: string;
};

type AuditMeta = Pick<RequestMeta, `ipAddress` | `userAgent`>;

type NormalizedCapabilityOverride = {
  capability: string;
  mode: AdminPermissionOverrideMode;
};

type PermissionOverrideChange = {
  capability: string;
  previous: boolean | null;
  next: boolean | null;
};

export function requireConfirmation(confirmed: boolean | undefined, message: string) {
  if (confirmed !== true) {
    throw new BadRequestException(message);
  }
}

export function requireDistinctAdminTarget(targetAdminId: string, actorAdminId: string, message: string) {
  if (targetAdminId === actorAdminId) {
    throw new ConflictException(message);
  }
}

export function requireValidVersion(version?: number): number {
  const expectedVersion = Number(version);
  if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
    throw new BadRequestException(`Valid version is required`);
  }
  return expectedVersion;
}

export function requireAllowedRoleKey(roleKey?: string): string {
  const nextRoleKey = String(roleKey ?? ``).trim();
  if (!ALLOWED_ROLE_KEYS.has(nextRoleKey)) {
    throw new BadRequestException(`Unsupported admin role`);
  }
  return nextRoleKey;
}

export function normalizeCapabilityOverrides(
  capabilityOverrides?: Array<{ capability: string; mode: string }>,
): NormalizedCapabilityOverride[] {
  const requestedOverrides = Array.isArray(capabilityOverrides) ? capabilityOverrides : [];
  return requestedOverrides.map((override) => ({
    capability: String(override.capability ?? ``).trim(),
    mode: String(override.mode ?? ``).trim() as AdminPermissionOverrideMode,
  }));
}

export function assertKnownCapabilityOverrides(normalizedOverrides: readonly NormalizedCapabilityOverride[]) {
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
}

export function assertAdminFound<T>(target: T | null | undefined): asserts target is T {
  if (!target) {
    throw new NotFoundException(`Admin not found`);
  }
}

export function assertExpectedVersion(updatedAt: Date, expectedVersion: number) {
  if (deriveVersion(updatedAt) !== expectedVersion) {
    throw new ConflictException(buildStaleVersionPayload(updatedAt));
  }
}

export function assertActiveAdminTarget(deletedAt: Date | null, message: string) {
  if (deletedAt) {
    throw new ConflictException(message);
  }
}

export function throwStaleMutationConflict(current: { updatedAt: Date } | null | undefined): never {
  throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
}

export function buildAdminStatusAuditPayload(
  actorAdminId: string,
  updated: LifecycleTarget,
  action: `delete` | `restore`,
  meta: AuditMeta,
) {
  return {
    adminId: actorAdminId,
    action: action === `delete` ? ADMIN_ACTION_AUDIT_ACTIONS.admin_delete : ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
    resourceId: updated.id,
    metadata: {
      targetEmail: updated.email,
    },
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  };
}

export function buildAdminStatusResult(updated: LifecycleTarget) {
  return {
    adminId: updated.id,
    status: deriveStatus(updated.deletedAt),
    deletedAt: toNullableIso(updated.deletedAt),
    version: deriveVersion(updated.updatedAt),
  };
}

export function buildAlreadyInactiveResult(target: LifecycleTarget) {
  return {
    adminId: target.id,
    status: `INACTIVE` as const,
    deletedAt: target.deletedAt?.toISOString() ?? null,
    version: deriveVersion(target.updatedAt),
    alreadyInactive: true,
  };
}

export function buildDeactivatedResult(fresh: FreshLifecycleResult, deactivatedAt: Date) {
  return {
    adminId: fresh.id,
    status: `INACTIVE` as const,
    deletedAt: fresh.deletedAt?.toISOString() ?? deactivatedAt.toISOString(),
    version: deriveVersion(fresh.updatedAt),
    alreadyInactive: false,
  };
}

export function buildDeactivationAuditEntry(
  actorAdminId: string,
  target: LifecycleTarget,
  reason: string | null,
  meta: AuditMeta,
) {
  return {
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
  };
}

export function buildAlreadyActiveResult(target: LifecycleTarget) {
  return {
    adminId: target.id,
    status: `ACTIVE` as const,
    version: deriveVersion(target.updatedAt),
    alreadyActive: true,
  };
}

export function buildRestoredResult(fresh: FreshLifecycleResult) {
  return {
    adminId: fresh.id,
    status: `ACTIVE` as const,
    deletedAt: toNullableIso(fresh.deletedAt),
    version: deriveVersion(fresh.updatedAt),
    alreadyActive: false,
  };
}

export function buildRestoreAuditEntry(actorAdminId: string, target: LifecycleTarget, meta: AuditMeta) {
  return {
    adminId: actorAdminId,
    action: ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
    resource: `admin`,
    resourceId: target.id,
    metadata: {
      targetEmail: target.email,
    },
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  };
}

export function buildAlreadyAppliedRoleResult(target: Pick<RoleTarget, `id` | `updatedAt`>, nextRoleKey: string) {
  return {
    adminId: target.id,
    roleKey: nextRoleKey,
    version: deriveVersion(target.updatedAt),
    alreadyApplied: true,
  };
}

export function buildChangedRoleResult(targetId: string, fresh: FreshRoleResult, nextRoleKey: string) {
  return {
    adminId: targetId,
    roleKey: fresh.role?.key ?? nextRoleKey,
    version: deriveVersion(fresh.updatedAt),
    alreadyApplied: false,
  };
}

export function buildRoleChangeAuditEntry(
  actorAdminId: string,
  target: RoleTarget,
  nextRole: RoleRecord,
  nextRoleKey: string,
  meta: AuditMeta,
) {
  return {
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
  };
}

export function buildPermissionIdByCapability(permissionRows: readonly PermissionRecord[]) {
  return new Map(permissionRows.map((permission) => [permission.capability, permission.id]));
}

export function assertAvailableCapabilityOverrides(
  normalizedOverrides: readonly NormalizedCapabilityOverride[],
  permissionIdByCapability: ReadonlyMap<string, string>,
) {
  if (normalizedOverrides.some((override) => !permissionIdByCapability.has(override.capability))) {
    throw new BadRequestException(`One or more requested capabilities are unavailable`);
  }
}

export function buildPermissionOverrideChanges(
  target: PermissionTarget,
  normalizedOverrides: readonly NormalizedCapabilityOverride[],
): PermissionOverrideChange[] {
  const currentOverrideMap = new Map(
    target.permissionOverrides
      .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
      .map((override) => [override.permission.capability, override.granted]),
  );
  const nextOverrideMap = new Map<string, boolean | null>();
  for (const override of normalizedOverrides) {
    nextOverrideMap.set(override.capability, toPermissionOverrideGrant(override.mode));
  }

  return [...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES].flatMap((capability) => {
    const current = currentOverrideMap.has(capability) ? currentOverrideMap.get(capability)! : null;
    const next = nextOverrideMap.has(capability) ? nextOverrideMap.get(capability)! : null;
    return current === next ? [] : [{ capability, previous: current, next }];
  });
}

export function buildAlreadyAppliedPermissionResult(
  target: Pick<PermissionTarget, `id` | `updatedAt`>,
  normalizedOverrides: readonly NormalizedCapabilityOverride[],
) {
  return {
    adminId: target.id,
    version: deriveVersion(target.updatedAt),
    overrides: normalizedOverrides,
    alreadyApplied: true,
  };
}

export function buildTouchedPermissionIds(
  normalizedOverrides: readonly NormalizedCapabilityOverride[],
  permissionIdByCapability: ReadonlyMap<string, string>,
) {
  return [...new Set(normalizedOverrides.map((override) => permissionIdByCapability.get(override.capability)!))];
}

export function buildPermissionChangeAuditEntry(
  actorAdminId: string,
  target: LifecycleTarget,
  changes: readonly PermissionOverrideChange[],
  meta: AuditMeta,
) {
  return {
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
  };
}

export function buildChangedPermissionResult(targetId: string, fresh: FreshPermissionResult) {
  return {
    adminId: targetId,
    version: deriveVersion(fresh.updatedAt),
    overrides: fresh.permissionOverrides
      .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
      .map((override) => ({
        capability: override.permission.capability,
        granted: override.granted,
      })),
    alreadyApplied: false,
  };
}
