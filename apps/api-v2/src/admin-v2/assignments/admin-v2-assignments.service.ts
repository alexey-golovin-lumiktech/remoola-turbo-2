import { randomUUID } from 'crypto';

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import {
  assertCanReleaseAssignment,
  assertExpectedReleasedAtNull,
  validateMandatoryAssignmentReason,
  validateOptionalAssignmentReason,
} from './admin-v2-assignment-policy';
import { ASSIGNABLE_RESOURCE_TYPES, AssignableResourceType, assertResourceType } from './admin-v2-assignments.dto';
import { AdminV2AssignmentsQuery } from './admin-v2-assignments.query';
import { AdminV2AssignmentsRepository } from './admin-v2-assignments.repository';

type AssignmentRequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

export type AssignmentActorContext = {
  id: string;
  email?: string;
  type: string;
};

@Injectable()
export class AdminV2AssignmentsService {
  constructor(
    private readonly query: AdminV2AssignmentsQuery,
    private readonly repository: AdminV2AssignmentsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly adminActionAudit: AdminActionAuditService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  async claim(
    actor: AssignmentActorContext,
    body: { resourceType?: string; resourceId?: string; reason?: string | null },
    meta: AssignmentRequestMeta,
  ) {
    const adminId = actor.id;
    if (!body.resourceType || typeof body.resourceType !== `string`) {
      throw new BadRequestException(`resourceType is required`);
    }
    assertResourceType(body.resourceType);
    const resourceType: AssignableResourceType = body.resourceType;
    const resourceId = body.resourceId ?? ``;
    const reason = validateOptionalAssignmentReason(body.reason);

    return this.idempotency.execute({
      adminId,
      scope: `assignment-claim`,
      key: meta.idempotencyKey,
      payload: { resourceType, resourceId, reason },
      execute: async () => {
        const result = await this.repository.claim({ resourceType, resourceId, adminId, reason });

        if (result.createdNow) {
          await this.adminActionAudit.record({
            adminId,
            action: ADMIN_ACTION_AUDIT_ACTIONS.assignment_claim,
            resource: resourceType,
            resourceId,
            metadata: {
              assignmentId: result.assignment.id,
              reason,
              severity: `high`,
            },
            ipAddress: meta.ipAddress ?? null,
            userAgent: meta.userAgent ?? null,
          });
        }

        const assignedTo = await this.query.loadAdminSummary(result.assignment.assigned_to);
        return {
          assignmentId: result.assignment.id,
          assignedAt: result.assignment.assigned_at.toISOString(),
          assignedTo,
          status: result.status,
        };
      },
    });
  }

  async release(
    actor: AssignmentActorContext,
    body: { assignmentId?: string; reason?: string | null; expectedReleasedAtNull?: number },
    meta: AssignmentRequestMeta,
  ) {
    if (!body.assignmentId) {
      throw new BadRequestException(`assignmentId is required`);
    }
    assertExpectedReleasedAtNull(Number(body.expectedReleasedAtNull));
    const reason = validateOptionalAssignmentReason(body.reason);
    const assignmentId = body.assignmentId;
    const adminId = actor.id;

    return this.idempotency.execute({
      adminId,
      scope: `assignment-release`,
      key: meta.idempotencyKey,
      payload: { assignmentId, reason, expectedReleasedAtNull: 0 },
      execute: async () => {
        const profile = await this.accessService.getAccessProfile(actor);
        const release = await this.repository.release({
          assignmentId,
          adminId,
          assertCanReleaseLockedAssignment: (locked) => {
            assertCanReleaseAssignment({ assignedTo: locked.assigned_to, adminId, profile });
          },
        });

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.assignment_release,
          resource: release.row.resource_type,
          resourceId: release.row.resource_id,
          metadata: {
            assignmentId: release.row.id,
            reason,
            releasedFrom: release.releasedFrom,
            severity: `high`,
          },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });

        return {
          assignmentId: release.row.id,
          releasedAt: release.row.released_at!.toISOString(),
        };
      },
    });
  }

  async reassign(
    actor: AssignmentActorContext,
    body: {
      assignmentId?: string;
      newAssigneeId?: string;
      confirmed?: boolean;
      reason?: string;
      expectedReleasedAtNull?: number;
    },
    meta: AssignmentRequestMeta,
  ) {
    if (!body.assignmentId) {
      throw new BadRequestException(`assignmentId is required`);
    }
    if (!body.newAssigneeId) {
      throw new BadRequestException(`newAssigneeId is required`);
    }
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for reassign`);
    }
    assertExpectedReleasedAtNull(Number(body.expectedReleasedAtNull));
    const reason = validateMandatoryAssignmentReason(body.reason);

    const adminId = actor.id;
    const profile = await this.accessService.getAccessProfile(actor);
    if (profile.role !== `SUPER_ADMIN`) {
      throw new ForbiddenException(`Reassign requires SUPER_ADMIN`);
    }

    const assignmentId = body.assignmentId;
    const newAssigneeId = body.newAssigneeId;
    if (newAssigneeId === adminId) {
      throw new BadRequestException(`Reassign to self is not allowed; use release + claim instead`);
    }

    const targetAdmin = await this.query.getAdminTargetForReassign(newAssigneeId);
    if (!targetAdmin) {
      throw new NotFoundException(`Target admin not found`);
    }
    if (targetAdmin.deletedAt) {
      throw new BadRequestException(`Target admin is deactivated`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `assignment-reassign`,
      key: meta.idempotencyKey,
      payload: { assignmentId, newAssigneeId, confirmed: true, reason, expectedReleasedAtNull: 0 },
      execute: async () => {
        const transferOperationId = randomUUID();
        const result = await this.repository.reassign({
          assignmentId,
          newAssigneeId,
          adminId,
          reason,
          transferOperationId,
          meta,
        });

        const assignedTo = await this.query.loadAdminSummary(result.newRow.assigned_to);
        return {
          oldAssignmentId: result.closedRow.id,
          newAssignmentId: result.newRow.id,
          releasedAt: result.closedRow.released_at!.toISOString(),
          assignedAt: result.newRow.assigned_at.toISOString(),
          assignedTo,
        };
      },
    });
  }

  get supportedResourceTypes(): readonly AssignableResourceType[] {
    return ASSIGNABLE_RESOURCE_TYPES;
  }

  async getAssignmentContextForResource(resourceType: AssignableResourceType, resourceId: string) {
    return this.query.getAssignmentContextForResource(resourceType, resourceId);
  }

  async getActiveAssigneesForResource(resourceType: AssignableResourceType, resourceIds: string[]) {
    return this.query.getActiveAssigneesForResource(resourceType, resourceIds);
  }
}
