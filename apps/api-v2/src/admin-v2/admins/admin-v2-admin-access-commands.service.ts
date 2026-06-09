import { BadRequestException, Injectable } from '@nestjs/common';

import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  assertActiveAdminTarget,
  assertAvailableCapabilityOverrides,
  assertKnownCapabilityOverrides,
  buildAlreadyAppliedPermissionResult,
  buildAlreadyAppliedRoleResult,
  buildChangedPermissionResult,
  buildChangedRoleResult,
  buildPermissionChangeAuditEntry,
  buildPermissionIdByCapability,
  buildPermissionOverrideChanges,
  buildRoleChangeAuditEntry,
  buildTouchedPermissionIds,
  normalizeCapabilityOverrides,
  requireAllowedRoleKey,
} from './admin-v2-admin-access-mutation.helpers';
import {
  assertAdminFound,
  assertExpectedVersion,
  requireConfirmation,
  requireValidVersion,
  throwStaleMutationConflict,
} from './admin-v2-admin-mutation-helpers';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { ADMIN_PERMISSION_OVERRIDE_CAPABILITIES, type RequestMeta, toAdminType } from './admin-v2-admins.utils';

@Injectable()
export class AdminV2AdminAccessCommandsService {
  constructor(
    private readonly repository: AdminV2AdminMutationsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
  ) {}

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
