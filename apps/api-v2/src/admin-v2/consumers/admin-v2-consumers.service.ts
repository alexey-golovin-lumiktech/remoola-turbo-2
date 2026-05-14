import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import {
  normalizeFlag,
  normalizeOptionalReason,
  validateConsumerSuspensionReason,
} from './admin-v2-consumer-action-policy';
import { AdminV2ConsumerActivityQuery } from './admin-v2-consumer-activity.query';
import { ConsumerAdminCaseQuery } from './admin-v2-consumer-case.query';
import { AdminV2ConsumerFlagsRepository } from './admin-v2-consumer-flags.repository';
import { AdminV2ConsumerLedgerQuery } from './admin-v2-consumer-ledger.query';
import { AdminV2ConsumerNotesRepository } from './admin-v2-consumer-notes.repository';
import {
  ACCOUNT_TYPES,
  buildCreatedAtFilter,
  CONTRACTOR_KINDS,
  mapConsumerDisplayName,
  normalizePagination,
  VERIFICATION_STATUSES,
} from './admin-v2-consumer-query-helpers';
import { AdminV2ConsumerRepository } from './admin-v2-consumer.repository';
import { ConsumerAuthService } from '../../consumer/auth/auth.service';
import { ConsumerContractsService } from '../../consumer/modules/contracts/consumer-contracts.service';
import { AdminActionAuditService, ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

const SEARCH_MAX_LEN = 200;
const NOTE_MAX_LEN = 4000;
const DEFAULT_CONSUMER_ACTION_RANGE_DAYS = 7;

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type SuspendConsumerBody = {
  confirmed?: boolean;
  reason?: string;
};

type ResendConsumerEmailBody = {
  emailKind: `signup_verification` | `password_recovery`;
  appScope: ConsumerAppScope;
};

@Injectable()
export class AdminV2ConsumersService {
  // This service owns orchestration only: it coordinates repositories, read-side queries,
  // and side-effect collaborators without taking a direct Prisma dependency.
  constructor(
    private readonly consumerRepository: AdminV2ConsumerRepository,
    private readonly consumerActivityQuery: AdminV2ConsumerActivityQuery,
    private readonly consumerLedgerQuery: AdminV2ConsumerLedgerQuery,
    private readonly consumerNotesRepository: AdminV2ConsumerNotesRepository,
    private readonly consumerFlagsRepository: AdminV2ConsumerFlagsRepository,
    private readonly consumerContractsService: ConsumerContractsService,
    private readonly adminActionAudit: AdminActionAuditService,
    private readonly consumerAuthService: ConsumerAuthService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly consumerCaseQuery: ConsumerAdminCaseQuery,
  ) {}

  private async requireConsumer(consumerId: string) {
    const consumer = await this.consumerRepository.findSummaryById(consumerId);
    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }
    return consumer;
  }

  async listConsumers(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    accountType?: string;
    contractorKind?: string;
    verificationStatus?: string;
    includeDeleted?: boolean;
  }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 20, 1), 100);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;
    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const accountType =
      params?.accountType && ACCOUNT_TYPES.includes(params.accountType)
        ? (params.accountType as $Enums.AccountType)
        : undefined;
    const contractorKind =
      params?.contractorKind && CONTRACTOR_KINDS.includes(params.contractorKind)
        ? (params.contractorKind as $Enums.ContractorKind)
        : undefined;
    const verificationStatus =
      params?.verificationStatus && VERIFICATION_STATUSES.includes(params.verificationStatus)
        ? (params.verificationStatus as $Enums.VerificationStatus)
        : undefined;

    const where: Prisma.ConsumerModelWhereInput = {
      ...(params?.includeDeleted === true ? {} : { deletedAt: null }),
      ...(accountType ? { accountType } : {}),
      ...(contractorKind ? { contractorKind } : {}),
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(search
        ? {
            OR: [
              { id: { equals: search } },
              { email: { contains: search, mode: `insensitive` } },
              { personalDetails: { firstName: { contains: search, mode: `insensitive` } } },
              { personalDetails: { lastName: { contains: search, mode: `insensitive` } } },
              { organizationDetails: { name: { contains: search, mode: `insensitive` } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.consumerRepository.findMany(where, skip, pageSize),
      this.consumerRepository.count(where),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        displayName: mapConsumerDisplayName(item),
        summary: {
          notesCount: item._count.adminNotes,
          activeFlagsCount: item._count.adminFlags,
          deleted: item.deletedAt != null,
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  async getConsumerContracts(
    consumerId: string,
    params?: {
      page?: number;
      pageSize?: number;
      q?: string;
    },
  ) {
    await this.requireConsumer(consumerId);
    return this.consumerContractsService.getContracts(consumerId, params?.page, params?.pageSize, params?.q);
  }

  async getConsumerLedgerSummary(consumerId: string) {
    await this.requireConsumer(consumerId);
    return this.consumerLedgerQuery.getLedgerSummary(consumerId);
  }

  async getConsumerAuthHistory(
    consumerId: string,
    params?: {
      page?: number;
      pageSize?: number;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    const consumer = await this.requireConsumer(consumerId);
    const pagination = normalizePagination(params?.page, params?.pageSize);
    const createdAt = buildCreatedAtFilter(params?.dateFrom, params?.dateTo);
    const where = {
      identityType: AUTH_IDENTITY_TYPES.consumer,
      OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
      ...(createdAt ? { createdAt } : {}),
    };

    const [items, total] = await Promise.all([
      this.consumerActivityQuery.findAuthHistory(where, pagination.skip, pagination.pageSize),
      this.consumerActivityQuery.countAuthHistory(where),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getConsumerActionLog(
    consumerId: string,
    params?: {
      page?: number;
      pageSize?: number;
      dateFrom?: Date;
      dateTo?: Date;
      action?: string;
    },
  ) {
    await this.requireConsumer(consumerId);
    const pagination = normalizePagination(params?.page, params?.pageSize);
    const dateTo = params?.dateTo ?? new Date();
    const dateFrom =
      params?.dateFrom ?? new Date(Date.now() - DEFAULT_CONSUMER_ACTION_RANGE_DAYS * 24 * 60 * 60 * 1000);
    const createdAt = buildCreatedAtFilter(dateFrom, dateTo);
    const where = {
      consumerId,
      ...(params?.action?.trim() ? { action: params.action.trim() } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [items, total] = await Promise.all([
      this.consumerActivityQuery.findActionLog(where, pagination.skip, pagination.pageSize),
      this.consumerActivityQuery.countActionLog(where),
    ]);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      dateFrom,
      dateTo,
    };
  }

  async getConsumerCase(consumerId: string) {
    return this.consumerCaseQuery.getConsumerCase(consumerId);
  }

  async createNote(consumerId: string, adminId: string, content: string, meta?: RequestMeta) {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException(`Note content is required`);
    }
    if (normalizedContent.length > NOTE_MAX_LEN) {
      throw new BadRequestException(`Note content is too long`);
    }

    return this.consumerNotesRepository.createWithAudit(consumerId, adminId, normalizedContent, meta);
  }

  async addFlag(consumerId: string, adminId: string, flag: string, reason?: string | null, meta?: RequestMeta) {
    const normalizedFlag = normalizeFlag(flag);
    if (!normalizedFlag) {
      throw new BadRequestException(`Flag is required`);
    }

    const normalizedReason = normalizeOptionalReason(reason);
    const existing = await this.consumerFlagsRepository.findActiveByConsumerAndFlag(consumerId, normalizedFlag);
    if (existing) {
      return { ...existing, alreadyExisted: true };
    }

    return this.consumerFlagsRepository.createWithAudit(consumerId, adminId, normalizedFlag, normalizedReason, meta);
  }

  async removeFlag(consumerId: string, flagId: string, adminId: string, version: number, meta?: RequestMeta) {
    if (!Number.isFinite(version) || version < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.consumerFlagsRepository.removeWithAudit(consumerId, flagId, adminId, version, meta);
  }

  async forceLogout(consumerId: string, adminId: string, body: { confirmed?: boolean }, meta?: RequestMeta) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for force logout`);
    }
    const consumer = await this.requireConsumer(consumerId);
    return this.idempotency.execute({
      adminId,
      scope: `consumer-force-logout:${consumerId}`,
      key: meta?.idempotencyKey,
      payload: { consumerId, confirmed: true },
      execute: async () => {
        const activeSessionsBefore = await this.consumerRepository.countActiveSessions(consumerId);
        await this.consumerAuthService.revokeAllSessionsByConsumerIdAndAudit(consumerId, {
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_force_logout,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: { activeSessionsBefore, consumerEmail: consumer.email },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        return {
          consumerId,
          revokedSessionsCount: activeSessionsBefore,
          alreadyRevoked: activeSessionsBefore === 0,
        };
      },
    });
  }

  async suspendConsumer(consumerId: string, adminId: string, body: SuspendConsumerBody, meta?: RequestMeta) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for consumer suspension`);
    }

    const reason = validateConsumerSuspensionReason(body.reason);

    const consumer = await this.requireConsumer(consumerId);
    return this.idempotency.execute({
      adminId,
      scope: `consumer-suspend:${consumerId}`,
      key: meta?.idempotencyKey,
      payload: { consumerId, confirmed: true, reason },
      execute: async () => {
        const suspendedAt = new Date();
        const updated = await this.consumerRepository.suspendIfActive(consumerId, adminId, reason, suspendedAt);
        if (updated.count === 0) {
          const current = await this.requireConsumer(consumerId);
          return {
            consumerId,
            suspendedAt: current.suspendedAt,
            alreadySuspended: current.suspendedAt != null,
            emailDispatched: false,
          };
        }

        await this.consumerAuthService.revokeAllSessionsByConsumerIdAndAudit(consumerId, {
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        let emailDispatched = false;
        try {
          emailDispatched = await this.consumerAuthService.sendConsumerSuspensionEmail(consumerId, reason);
        } catch {
          emailDispatched = false;
        }

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_suspend,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: {
            consumerEmail: consumer.email,
            reason,
            suspendedAt,
            emailKind: `consumer_suspension`,
            emailDispatched,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        return {
          consumerId,
          suspendedAt,
          alreadySuspended: false,
          emailDispatched,
        };
      },
    });
  }

  async resendConsumerEmail(consumerId: string, adminId: string, body: ResendConsumerEmailBody, meta?: RequestMeta) {
    const consumer = await this.requireConsumer(consumerId);
    return this.idempotency.execute({
      adminId,
      scope: `consumer-email-resend:${consumerId}:${body.emailKind}:${body.appScope}`,
      key: meta?.idempotencyKey,
      payload: {
        consumerId,
        requestedEmailKind: body.emailKind,
        appScope: body.appScope,
      },
      execute: async () => {
        let result:
          | { requestedKind: `signup_verification`; dispatchedKind: `signup_verification`; emailDispatched: boolean }
          | {
              requestedKind: `password_recovery`;
              dispatchedKind: `password_reset` | `google_signin_recovery`;
              emailDispatched: boolean;
            };

        if (body.emailKind === `signup_verification`) {
          const emailDispatched = await this.consumerAuthService.resendSignupVerificationEmail(
            consumerId,
            body.appScope,
          );
          if (!emailDispatched) {
            throw new ConflictException(`Failed to dispatch signup verification email`);
          }
          result = {
            requestedKind: `signup_verification`,
            dispatchedKind: `signup_verification`,
            emailDispatched,
          };
        } else {
          const outcome = await this.consumerAuthService.resendPasswordRecoveryEmail(consumerId, body.appScope);
          result = {
            ...outcome,
            emailDispatched: true,
          };
        }

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_email_resend,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: {
            consumerEmail: consumer.email,
            requestedEmailKind: result.requestedKind,
            dispatchedEmailKind: result.dispatchedKind,
            appScope: body.appScope,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        return {
          consumerId,
          ...result,
        };
      },
    });
  }
}
