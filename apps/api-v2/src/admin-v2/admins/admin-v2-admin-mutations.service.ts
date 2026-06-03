import { BadRequestException, Injectable } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { hashPassword } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import {
  assertActiveAdminTarget,
  assertAdminFound,
  assertAvailableCapabilityOverrides,
  assertExpectedVersion,
  assertKnownCapabilityOverrides,
  buildAdminStatusAuditPayload,
  buildAdminStatusResult,
  buildAlreadyActiveResult,
  buildAlreadyAppliedPermissionResult,
  buildAlreadyAppliedRoleResult,
  buildAlreadyInactiveResult,
  buildChangedPermissionResult,
  buildChangedRoleResult,
  buildDeactivatedResult,
  buildDeactivationAuditEntry,
  buildPermissionChangeAuditEntry,
  buildPermissionIdByCapability,
  buildPermissionOverrideChanges,
  buildRestoreAuditEntry,
  buildRestoredResult,
  buildRoleChangeAuditEntry,
  buildTouchedPermissionIds,
  normalizeCapabilityOverrides,
  requireAllowedRoleKey,
  requireConfirmation,
  requireDistinctAdminTarget,
  requireValidVersion,
  throwStaleMutationConflict,
} from './admin-v2-admin-mutation-helpers';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import {
  ADMIN_PERMISSION_OVERRIDE_CAPABILITIES,
  type RequestMeta,
  deriveStatus,
  deriveVersion,
  normalizeReason,
  toAdminType,
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

    await this.auditTrail.recordAdminActionAudit(buildAdminStatusAuditPayload(actorAdminId, updated, action, meta));

    return buildAdminStatusResult(updated);
  }

  async deactivateAdmin(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; reason?: string | null },
    meta: RequestMeta,
  ) {
    requireConfirmation(body.confirmed, `Confirmation is required for admin deactivation`);
    requireDistinctAdminTarget(targetAdminId, actorAdminId, `You cannot deactivate your own admin account`);

    const expectedVersion = requireValidVersion(body.version);
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
        assertAdminFound(target);
        assertExpectedVersion(target.updatedAt, expectedVersion);
        if (target.deletedAt) {
          return buildAlreadyInactiveResult(target);
        }

        const deactivatedAt = new Date();

        const updated = await this.repository.deactivateAdmin(tx, {
          targetId: target.id,
          expectedUpdatedAt: target.updatedAt,
          deactivatedAt,
        });
        if (updated.count === 0) {
          const current = await this.repository.findAdminUpdatedAt(tx, target.id);
          throwStaleMutationConflict(current);
        }

        await this.repository.revokeActiveSessions(tx, target.id, deactivatedAt);
        await this.repository.deleteRefreshTokens(tx, target.id);
        await this.repository.createAuditEntry(tx, buildDeactivationAuditEntry(actorAdminId, target, reason, meta));

        const fresh = await this.repository.findAdminLifecycleResult(tx, target.id);
        return buildDeactivatedResult(fresh, deactivatedAt);
      },
    });
  }

  async restoreAdmin(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = requireValidVersion(body.version);

    return this.idempotency.executeInTransaction({
      adminId: actorAdminId,
      scope: `admin-restore:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: { targetAdminId, expectedVersion },
      execute: async (tx) => {
        const target = await this.repository.getAdminLifecycleTarget(targetAdminId);
        assertAdminFound(target);
        assertExpectedVersion(target.updatedAt, expectedVersion);
        if (!target.deletedAt) {
          return buildAlreadyActiveResult(target);
        }

        const updated = await this.repository.restoreAdmin(tx, {
          targetId: target.id,
          expectedUpdatedAt: target.updatedAt,
        });
        if (updated.count === 0) {
          const current = await this.repository.findAdminUpdatedAt(tx, target.id);
          throwStaleMutationConflict(current);
        }

        await this.repository.createAuditEntry(tx, buildRestoreAuditEntry(actorAdminId, target, meta));

        const fresh = await this.repository.findAdminLifecycleResult(tx, target.id);
        return buildRestoredResult(fresh);
      },
    });
  }

  async changeAdminRole(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; roleKey?: string },
    meta: RequestMeta,
  ) {
    requireConfirmation(body.confirmed, `Confirmation is required for admin role change`);
    const expectedVersion = requireValidVersion(body.version);
    const nextRoleKey = requireAllowedRoleKey(body.roleKey);

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
        assertAdminFound(target);
        assertExpectedVersion(target.updatedAt, expectedVersion);
        assertActiveAdminTarget(target.deletedAt, `Inactive admins cannot change roles until restored`);
        if (target.role?.key === nextRoleKey) {
          return buildAlreadyAppliedRoleResult(target, nextRoleKey);
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
          throwStaleMutationConflict(current);
        }

        await this.repository.createAuditEntry(
          tx,
          buildRoleChangeAuditEntry(actorAdminId, target, nextRole, nextRoleKey, meta),
        );

        const fresh = await this.repository.findAdminRoleResult(tx, target.id);
        return buildChangedRoleResult(target.id, fresh, nextRoleKey);
      },
    });
  }

  async changeAdminPermissions(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; capabilityOverrides?: Array<{ capability: string; mode: string }> },
    meta: RequestMeta,
  ) {
    const expectedVersion = requireValidVersion(body.version);
    const normalizedOverrides = normalizeCapabilityOverrides(body.capabilityOverrides);
    assertKnownCapabilityOverrides(normalizedOverrides);

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
        assertAdminFound(target);
        assertExpectedVersion(target.updatedAt, expectedVersion);
        assertActiveAdminTarget(target.deletedAt, `Inactive admins cannot change permission overrides until restored`);

        const relevantPermissions = await this.repository.listRelevantPermissions([
          ...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES,
        ]);
        const permissionIdByCapability = buildPermissionIdByCapability(relevantPermissions);
        assertAvailableCapabilityOverrides(normalizedOverrides, permissionIdByCapability);

        const changes = buildPermissionOverrideChanges(target, normalizedOverrides);
        if (changes.length === 0) {
          return buildAlreadyAppliedPermissionResult(target, normalizedOverrides);
        }

        await this.repository.replaceAdminPermissionOverrides(tx, {
          adminId: target.id,
          normalizedOverrides,
          touchedPermissionIds: buildTouchedPermissionIds(normalizedOverrides, permissionIdByCapability),
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
          throwStaleMutationConflict(current);
        }

        await this.repository.createAuditEntry(
          tx,
          buildPermissionChangeAuditEntry(actorAdminId, target, changes, meta),
        );

        const fresh = await this.repository.findAdminPermissionResult(tx, target.id);
        return buildChangedPermissionResult(target.id, fresh);
      },
    });
  }
}
