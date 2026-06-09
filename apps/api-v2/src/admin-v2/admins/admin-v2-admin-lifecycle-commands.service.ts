import { Injectable } from '@nestjs/common';

import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import {
  buildAdminStatusAuditPayload,
  buildAdminStatusResult,
  buildAlreadyActiveResult,
  buildAlreadyInactiveResult,
  buildDeactivatedResult,
  buildDeactivationAuditEntry,
  buildRestoreAuditEntry,
  buildRestoredResult,
  requireDistinctAdminTarget,
} from './admin-v2-admin-lifecycle-mutation.helpers';
import {
  assertAdminFound,
  assertExpectedVersion,
  requireConfirmation,
  requireValidVersion,
  throwStaleMutationConflict,
} from './admin-v2-admin-mutation-helpers';
import { AdminV2AdminMutationsRepository } from './admin-v2-admin-mutations.repository';
import { type RequestMeta, normalizeReason } from './admin-v2-admins.utils';

@Injectable()
export class AdminV2AdminLifecycleCommandsService {
  constructor(
    private readonly repository: AdminV2AdminMutationsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly auditTrail: AdminV2AdminAuditTrail,
  ) {}

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
}
