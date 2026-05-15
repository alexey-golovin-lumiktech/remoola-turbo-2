import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2VerificationQuery } from './admin-v2-verification.query';
import {
  AdminV2VerificationRepository,
  type AdminV2VerificationDecisionState,
} from './admin-v2-verification.repository';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';
import { AdminV2ConsumersService } from '../consumers/admin-v2-consumers.service';

const ACTIVE_VERIFICATION_STATUSES = [
  $Enums.VerificationStatus.PENDING,
  $Enums.VerificationStatus.MORE_INFO,
  $Enums.VerificationStatus.FLAGGED,
] as const;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const REASON_MAX_LENGTH = 500;
type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type DecisionControls = {
  canForceLogout: boolean;
  canDecide: boolean;
  allowedActions: string[];
  canManageAssignments: boolean;
  canReassignAssignments: boolean;
};

type VerificationDecision = `approve` | `reject` | `request-info` | `flag`;

function normalizePage(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE));
  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize };
}

function normalizeReason(reason?: string | null): string | null {
  const normalized = reason?.trim();
  if (!normalized) return null;
  return normalized.slice(0, REASON_MAX_LENGTH);
}

function normalizeActiveStatuses(status?: string): Array<$Enums.VerificationStatus> {
  return status && ACTIVE_VERIFICATION_STATUSES.includes(status as (typeof ACTIVE_VERIFICATION_STATUSES)[number])
    ? [status as (typeof ACTIVE_VERIFICATION_STATUSES)[number]]
    : [...ACTIVE_VERIFICATION_STATUSES];
}

function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

function hasMissingProfileData(item: {
  accountType: $Enums.AccountType;
  personalDetails: { firstName: string | null; lastName: string | null } | null;
  organizationDetails: { name: string | null } | null;
  addressDetails: { country: string } | null;
}): boolean {
  const missingName =
    item.accountType === $Enums.AccountType.BUSINESS
      ? !item.organizationDetails?.name?.trim()
      : !item.personalDetails?.firstName?.trim() || !item.personalDetails?.lastName?.trim();
  return missingName || !item.addressDetails?.country?.trim();
}

@Injectable()
export class AdminV2VerificationService {
  private readonly logger = new Logger(AdminV2VerificationService.name);

  constructor(
    private readonly query: AdminV2VerificationQuery,
    private readonly repository: AdminV2VerificationRepository,
    private readonly consumersService: AdminV2ConsumersService,
    private readonly slaService: AdminV2VerificationSlaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly mailingService: MailingService,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

  async getQueue(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    stripeIdentityStatus?: string;
    country?: string;
    contractorKind?: string;
    missingProfileData?: boolean;
    missingDocuments?: boolean;
  }) {
    const pagination = normalizePage(params?.page, params?.pageSize);
    const statuses = normalizeActiveStatuses(params?.status);
    const stripeIdentityStatus = params?.stripeIdentityStatus?.trim() || undefined;
    const contractorKind = params?.contractorKind?.trim() || undefined;
    const country = params?.country?.trim() || undefined;

    const [rows, slaSnapshot] = await Promise.all([
      this.query.getQueueRows({ statuses, stripeIdentityStatus, contractorKind, country }),
      this.slaService.getSnapshot(),
    ]);

    const filtered = rows.filter((item) => {
      const missingProfileData = hasMissingProfileData(item);
      const missingDocuments = item._count.consumerResources === 0;
      if (params?.missingProfileData === true && !missingProfileData) return false;
      if (params?.missingDocuments === true && !missingDocuments) return false;
      return true;
    });
    const queueBreachedCount = filtered.filter((item) => slaSnapshot.breachedConsumerIds.has(item.id)).length;

    const pageSlice = filtered.slice(pagination.skip, pagination.skip + pagination.pageSize);
    const assigneesByResourceId = await this.assignmentsService.getActiveAssigneesForResource(
      `verification`,
      pageSlice.map((item) => item.id),
    );

    const items = pageSlice.map((item) => ({
      id: item.id,
      email: item.email,
      accountType: item.accountType,
      contractorKind: item.contractorKind,
      verificationStatus: item.verificationStatus,
      stripeIdentityStatus: item.stripeIdentityStatus,
      country: item.addressDetails?.country ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      verificationUpdatedAt: item.verificationUpdatedAt,
      missingProfileData: hasMissingProfileData(item),
      missingDocuments: item._count.consumerResources === 0,
      documentsCount: item._count.consumerResources,
      slaBreached: slaSnapshot.breachedConsumerIds.has(item.id),
      assignedTo: assigneesByResourceId.get(item.id) ?? null,
    }));

    return {
      items,
      total: filtered.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      activeStatuses: [...ACTIVE_VERIFICATION_STATUSES],
      sla: {
        breachedCount: queueBreachedCount,
        thresholdHours: slaSnapshot.thresholdHours,
        lastComputedAt: slaSnapshot.lastComputedAt,
      },
    };
  }

  async getQueueCount(filters?: {
    status?: string;
    stripeIdentityStatus?: string;
    country?: string;
    contractorKind?: string;
    missingProfileData?: boolean;
    missingDocuments?: boolean;
  }): Promise<number> {
    const statuses = normalizeActiveStatuses(filters?.status);
    const stripeIdentityStatus = filters?.stripeIdentityStatus?.trim() || undefined;
    const contractorKind = filters?.contractorKind?.trim() || undefined;
    const country = filters?.country?.trim() || undefined;

    if (filters?.missingProfileData === true || filters?.missingDocuments === true) {
      const rows = await this.query.getQueueCountRows({ statuses, stripeIdentityStatus, contractorKind, country });

      return rows.filter((item) => {
        const missingProfileData = hasMissingProfileData(item);
        const missingDocuments = item._count.consumerResources === 0;
        if (filters.missingProfileData === true && !missingProfileData) return false;
        if (filters.missingDocuments === true && !missingDocuments) return false;
        return true;
      }).length;
    }

    return this.query.countQueue({ statuses, stripeIdentityStatus, contractorKind, country });
  }

  async getCase(consumerId: string, controls: DecisionControls) {
    const [consumerCase, decisionHistory, authRisk, slaSnapshot, assignment] = await Promise.all([
      this.consumersService.getConsumerCase(consumerId),
      this.query.getDecisionHistory(consumerId),
      this.query.getAuthRiskContext(consumerId),
      this.slaService.getSnapshot(),
      this.assignmentsService.getAssignmentContextForResource(`verification`, consumerId),
    ]);
    if (!authRisk) {
      throw new NotFoundException(`Consumer not found`);
    }
    const updatedAt =
      consumerCase.updatedAt instanceof Date ? consumerCase.updatedAt : new Date(consumerCase.updatedAt);
    return {
      ...consumerCase,
      version: deriveVersion(updatedAt),
      decisionControls: controls,
      decisionHistory,
      authRisk,
      assignment,
      verificationSla: {
        breached: slaSnapshot.breachedConsumerIds.has(consumerId),
        thresholdHours: slaSnapshot.thresholdHours,
        lastComputedAt: slaSnapshot.lastComputedAt,
      },
    };
  }

  async applyDecision(
    consumerId: string,
    adminId: string,
    decision: VerificationDecision,
    body: { confirmed?: boolean; reason?: string | null; version?: number | string },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for verification decisions`);
    }
    const reason = normalizeReason(body.reason);
    if (decision === `reject` && !reason) {
      throw new BadRequestException(`Reject reason is required`);
    }
    const expectedVersion = typeof body.version === `string` ? Number(body.version) : Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion <= 0) {
      throw new BadRequestException(`Version is required`);
    }

    return this.idempotency.execute({
      adminId,
      scope: `verification:${decision}:${consumerId}`,
      key: meta.idempotencyKey,
      payload: { consumerId, decision, reason, expectedVersion, confirmed: true },
      execute: async () => {
        const notificationType = this.getDecisionNotificationType(decision);
        const nextState = this.getDecisionState(decision);
        const actionName = this.getDecisionAction(decision);
        const result = await this.repository.applyDecision({
          consumerId,
          adminId,
          reason,
          expectedVersion,
          notificationType,
          actionName,
          nextState,
          meta,
        });

        let notificationSent = false;
        if (notificationType === `email` && decision !== `flag`) {
          notificationSent = await this.mailingService.sendAdminV2VerificationDecisionEmail({
            email: result.consumerEmail,
            decision,
            reason,
          });
          await this.updateAuditNotificationStatus(result.auditEntryId, { ...result.auditMetadata, notificationSent });
        }

        await this.slaService.refreshBreaches();
        return {
          id: result.updatedConsumer.id,
          verificationStatus: result.updatedConsumer.verificationStatus,
          verificationReason: result.updatedConsumer.verificationReason,
          verificationUpdatedAt: result.updatedConsumer.verificationUpdatedAt,
          updatedAt: result.updatedConsumer.updatedAt,
          version: deriveVersion(result.updatedConsumer.updatedAt),
          ...(notificationType ? { notification: { type: notificationType, sent: notificationSent } } : {}),
        };
      },
    });
  }

  private async updateAuditNotificationStatus(auditEntryId: string, metadata: Prisma.InputJsonObject) {
    try {
      await this.repository.updateAuditNotificationStatus(auditEntryId, metadata);
    } catch (error) {
      this.logger.warn(`Failed to persist verification notification status`, {
        auditEntryId,
        message: error instanceof Error ? error.message : `Unknown`,
      });
    }
  }

  private getDecisionState(decision: VerificationDecision): AdminV2VerificationDecisionState {
    switch (decision) {
      case `approve`:
        return { verificationStatus: $Enums.VerificationStatus.APPROVED, verified: true, legalVerified: true };
      case `reject`:
        return { verificationStatus: $Enums.VerificationStatus.REJECTED, verified: false, legalVerified: false };
      case `request-info`:
        return { verificationStatus: $Enums.VerificationStatus.MORE_INFO, verified: false, legalVerified: false };
      case `flag`:
        return { verificationStatus: $Enums.VerificationStatus.FLAGGED, verified: false, legalVerified: false };
    }
  }

  private getDecisionAction(decision: VerificationDecision) {
    switch (decision) {
      case `approve`:
        return ADMIN_ACTION_AUDIT_ACTIONS.verification_approve;
      case `reject`:
        return ADMIN_ACTION_AUDIT_ACTIONS.verification_reject;
      case `request-info`:
        return ADMIN_ACTION_AUDIT_ACTIONS.verification_request_info;
      case `flag`:
        return ADMIN_ACTION_AUDIT_ACTIONS.verification_flag;
    }
  }

  private getDecisionNotificationType(decision: VerificationDecision): `email` | null {
    switch (decision) {
      case `approve`:
      case `reject`:
      case `request-info`:
        return `email`;
      case `flag`:
        return null;
    }
  }
}
