import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2ConsumersService } from '../consumers/admin-v2-consumers.service';

const ACTIVE_VERIFICATION_STATUSES = [
  $Enums.VerificationStatus.PENDING,
  $Enums.VerificationStatus.MORE_INFO,
  $Enums.VerificationStatus.FLAGGED,
] as const;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const REASON_MAX_LENGTH = 500;
const VERIFICATION_ACTIONS = [
  ADMIN_ACTION_AUDIT_ACTIONS.verification_approve,
  ADMIN_ACTION_AUDIT_ACTIONS.verification_reject,
  ADMIN_ACTION_AUDIT_ACTIONS.verification_request_info,
  ADMIN_ACTION_AUDIT_ACTIONS.verification_flag,
] as const;

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

type AssignmentSummaryRow = {
  id: string;
  resource_id: string;
  assigned_to: string;
  assigned_by: string | null;
  released_by: string | null;
  assigned_at: Date;
  released_at: Date | null;
  expires_at: Date | null;
  reason: string | null;
  assigned_to_email: string | null;
  assigned_by_email: string | null;
  released_by_email: string | null;
};

type AdminRef = { id: string; name: string | null; email: string | null };

function mapAdminRef(id: string | null, email: string | null): AdminRef | null {
  if (!id) return null;
  return { id, name: null, email };
}

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

function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

function buildStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Resource has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
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
    private readonly prisma: PrismaService,
    private readonly consumersService: AdminV2ConsumersService,
    private readonly slaService: AdminV2VerificationSlaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly mailingService: MailingService,
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
    const where: Prisma.ConsumerModelWhereInput = {
      deletedAt: null,
      verificationStatus: {
        in:
          params?.status &&
          ACTIVE_VERIFICATION_STATUSES.includes(params.status as (typeof ACTIVE_VERIFICATION_STATUSES)[number])
            ? [params.status as (typeof ACTIVE_VERIFICATION_STATUSES)[number]]
            : [...ACTIVE_VERIFICATION_STATUSES],
      },
      ...(params?.stripeIdentityStatus?.trim() ? { stripeIdentityStatus: params.stripeIdentityStatus.trim() } : {}),
      ...(params?.contractorKind?.trim()
        ? { contractorKind: params.contractorKind.trim() as $Enums.ContractorKind }
        : {}),
      ...(params?.country?.trim() ? { addressDetails: { is: { country: params.country.trim() } } } : {}),
    };

    const [rows, slaSnapshot] = await Promise.all([
      this.prisma.consumerModel.findMany({
        where,
        orderBy: [{ verificationUpdatedAt: `asc` }, { createdAt: `asc` }],
        select: {
          id: true,
          email: true,
          accountType: true,
          contractorKind: true,
          verificationStatus: true,
          stripeIdentityStatus: true,
          createdAt: true,
          updatedAt: true,
          verificationUpdatedAt: true,
          personalDetails: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          organizationDetails: {
            select: {
              name: true,
            },
          },
          addressDetails: {
            select: {
              country: true,
            },
          },
          _count: {
            select: {
              consumerResources: {
                where: { deletedAt: null, resource: { deletedAt: null } },
              },
            },
          },
        },
      }),
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
    const assigneesByResourceId = await this.getActiveAssignees(pageSlice.map((item) => item.id));

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
  }): Promise<number> {
    const where: Prisma.ConsumerModelWhereInput = {
      deletedAt: null,
      verificationStatus: {
        in:
          filters?.status &&
          ACTIVE_VERIFICATION_STATUSES.includes(filters.status as (typeof ACTIVE_VERIFICATION_STATUSES)[number])
            ? [filters.status as (typeof ACTIVE_VERIFICATION_STATUSES)[number]]
            : [...ACTIVE_VERIFICATION_STATUSES],
      },
      ...(filters?.stripeIdentityStatus?.trim() ? { stripeIdentityStatus: filters.stripeIdentityStatus.trim() } : {}),
      ...(filters?.contractorKind?.trim()
        ? { contractorKind: filters.contractorKind.trim() as $Enums.ContractorKind }
        : {}),
      ...(filters?.country?.trim() ? { addressDetails: { is: { country: filters.country.trim() } } } : {}),
    };

    return this.prisma.consumerModel.count({ where });
  }

  async getCase(consumerId: string, controls: DecisionControls) {
    const [consumerCase, decisionHistory, authRisk, slaSnapshot, assignment] = await Promise.all([
      this.consumersService.getConsumerCase(consumerId),
      this.getDecisionHistory(consumerId),
      this.getAuthRiskContext(consumerId),
      this.slaService.getSnapshot(),
      this.getAssignmentContext(consumerId),
    ]);
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

  private async getActiveAssignees(resourceIds: string[]): Promise<Map<string, AdminRef>> {
    if (resourceIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<Array<{ resource_id: string; assigned_to: string; email: string | null }>>(
      Prisma.sql`
        SELECT a."resource_id"::text AS resource_id, a."assigned_to"::text AS assigned_to, ad."email" AS email
        FROM "operational_assignment" a
        LEFT JOIN "admin" ad ON ad."id" = a."assigned_to"
        WHERE a."resource_type" = 'verification'
          AND a."released_at" IS NULL
          AND a."resource_id" = ANY(${resourceIds}::uuid[])
      `,
    );
    const result = new Map<string, AdminRef>();
    for (const row of rows) {
      result.set(row.resource_id, { id: row.assigned_to, name: null, email: row.email });
    }
    return result;
  }

  private async getAssignmentContext(consumerId: string) {
    const rows = await this.prisma.$queryRaw<AssignmentSummaryRow[]>(Prisma.sql`
      SELECT
        a."id",
        a."resource_id",
        a."assigned_to",
        a."assigned_by",
        a."released_by",
        a."assigned_at",
        a."released_at",
        a."expires_at",
        a."reason",
        at."email" AS assigned_to_email,
        ab."email" AS assigned_by_email,
        rb."email" AS released_by_email
      FROM "operational_assignment" a
      LEFT JOIN "admin" at ON at."id" = a."assigned_to"
      LEFT JOIN "admin" ab ON ab."id" = a."assigned_by"
      LEFT JOIN "admin" rb ON rb."id" = a."released_by"
      WHERE a."resource_type" = 'verification'
        AND a."resource_id" = ${Prisma.sql`${consumerId}::uuid`}
      ORDER BY a."assigned_at" DESC
      LIMIT 10
    `);
    const currentRow = rows.find((row) => row.released_at === null) ?? null;
    const current = currentRow
      ? {
          id: currentRow.id,
          assignedTo: mapAdminRef(currentRow.assigned_to, currentRow.assigned_to_email) ?? {
            id: currentRow.assigned_to,
            name: null,
            email: null,
          },
          assignedBy: mapAdminRef(currentRow.assigned_by, currentRow.assigned_by_email),
          assignedAt: currentRow.assigned_at.toISOString(),
          reason: currentRow.reason,
          expiresAt: currentRow.expires_at ? currentRow.expires_at.toISOString() : null,
        }
      : null;
    const history = rows.map((row) => ({
      id: row.id,
      assignedTo: mapAdminRef(row.assigned_to, row.assigned_to_email) ?? {
        id: row.assigned_to,
        name: null,
        email: null,
      },
      assignedBy: mapAdminRef(row.assigned_by, row.assigned_by_email),
      assignedAt: row.assigned_at.toISOString(),
      releasedAt: row.released_at ? row.released_at.toISOString() : null,
      releasedBy: mapAdminRef(row.released_by, row.released_by_email),
      reason: row.reason,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    }));
    return { current, history };
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
        const consumer = await this.prisma.consumerModel.findUnique({
          where: { id: consumerId },
          select: {
            id: true,
            verificationStatus: true,
            updatedAt: true,
            email: true,
          },
        });
        if (!consumer) {
          throw new NotFoundException(`Consumer not found`);
        }
        if (deriveVersion(consumer.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(consumer.updatedAt));
        }

        const nextState = this.getDecisionState(decision);
        const actionName = this.getDecisionAction(decision);
        const updatedAt = new Date();
        const auditMetadata = {
          fromStatus: consumer.verificationStatus,
          toStatus: nextState.verificationStatus,
          reason,
          expectedVersion,
          ...(notificationType ? { notificationType, notificationSent: false } : {}),
        } satisfies Prisma.InputJsonObject;
        const result = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.consumerModel.updateMany({
            where: {
              id: consumer.id,
              updatedAt: consumer.updatedAt,
            },
            data: {
              verificationStatus: nextState.verificationStatus,
              verified: nextState.verified,
              legalVerified: nextState.legalVerified,
              verificationReason: reason,
              verificationUpdatedAt: updatedAt,
              verificationUpdatedBy: adminId,
            },
          });
          if (updated.count === 0) {
            const current = await tx.consumerModel.findUnique({
              where: { id: consumer.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Consumer has changed`);
          }
          const auditEntry = await tx.adminActionAuditLogModel.create({
            data: {
              adminId,
              action: actionName,
              resource: `consumer`,
              resourceId: consumer.id,
              metadata: auditMetadata,
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
            select: {
              id: true,
            },
          });
          const updatedConsumer = await tx.consumerModel.findUniqueOrThrow({
            where: { id: consumer.id },
            select: {
              id: true,
              verificationStatus: true,
              verificationReason: true,
              verificationUpdatedAt: true,
              updatedAt: true,
            },
          });
          return { updatedConsumer, auditEntryId: auditEntry.id };
        });

        let notificationSent = false;
        if (notificationType === `email` && decision !== `flag`) {
          notificationSent = await this.mailingService.sendAdminV2VerificationDecisionEmail({
            email: consumer.email,
            decision,
            reason,
          });
          await this.updateAuditNotificationStatus(result.auditEntryId, {
            ...auditMetadata,
            notificationSent,
          });
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
      await this.prisma.adminActionAuditLogModel.update({
        where: { id: auditEntryId },
        data: {
          metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist verification notification status`, {
        auditEntryId,
        message: error instanceof Error ? error.message : `Unknown`,
      });
    }
  }

  private async getDecisionHistory(consumerId: string) {
    return this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resource: `consumer`,
        resourceId: consumerId,
        action: { in: [...VERIFICATION_ACTIONS] },
      },
      orderBy: { createdAt: `desc` },
      take: 20,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        adminId: true,
        admin: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  private async getAuthRiskContext(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }

    const failuresSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const refreshReuseSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [loginFailures24h, refreshReuse30d, recentEvents] = await Promise.all([
      this.prisma.authAuditLogModel.count({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
          event: AUTH_AUDIT_EVENTS.login_failure,
          createdAt: { gte: failuresSince },
        },
      }),
      this.prisma.authAuditLogModel.count({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
          createdAt: { gte: refreshReuseSince },
        },
      }),
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
        },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
    ]);

    return {
      loginFailures24h,
      refreshReuse30d,
      recentEvents,
    };
  }

  private getDecisionState(decision: VerificationDecision) {
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
