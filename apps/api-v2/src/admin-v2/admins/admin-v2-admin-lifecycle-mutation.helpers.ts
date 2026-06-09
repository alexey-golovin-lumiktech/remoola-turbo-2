import { ConflictException } from '@nestjs/common';

import { type RequestMeta, deriveStatus, deriveVersion, toNullableIso } from './admin-v2-admins.utils';
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

type AuditMeta = Pick<RequestMeta, `ipAddress` | `userAgent`>;

export function requireDistinctAdminTarget(targetAdminId: string, actorAdminId: string, message: string) {
  if (targetAdminId === actorAdminId) {
    throw new ConflictException(message);
  }
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
