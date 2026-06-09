import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import {
  assertConfirmedConsumerSuspension,
  assertConfirmedForceLogout,
  assertValidVersion,
  buildAlreadySuspendedResult,
  buildForceLogoutAuditMetadata,
  buildForceLogoutResult,
  buildResendEmailAuditMetadata,
  buildSuspendAuditMetadata,
  buildSuspendedResult,
  normalizeOptionalReason,
  validateNoteContent,
  validateConsumerSuspensionReason,
  validateRequiredFlag,
} from './admin-v2-consumer-action-policy';
import { AdminV2ConsumerActivityQuery } from './admin-v2-consumer-activity.query';
import { AdminV2ConsumerCaseQuery } from './admin-v2-consumer-case.query';
import { AdminV2ConsumerFlagsRepository } from './admin-v2-consumer-flags.repository';
import { AdminV2ConsumerLedgerQuery } from './admin-v2-consumer-ledger.query';
import { AdminV2ConsumerNotesRepository } from './admin-v2-consumer-notes.repository';
import { mapConsumerDisplayName } from './admin-v2-consumer-query-helpers';
import { type AdminV2ConsumerListParams, AdminV2ConsumerRepository } from './admin-v2-consumer.repository';
import {
  CONSUMER_ADMIN_AUTH_ACTIONS,
  type ConsumerAdminAuthActionsPort,
} from '../../consumer/auth/consumer-admin-auth-actions.port';
import { AdminActionAuditService, ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { ConsumerContractsService } from '../../shared/consumer-contracts/consumer-contracts.service';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

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
    @Inject(CONSUMER_ADMIN_AUTH_ACTIONS)
    private readonly consumerAdminAuthActions: ConsumerAdminAuthActionsPort,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly consumerCaseQuery: AdminV2ConsumerCaseQuery,
  ) {}

  private async requireConsumer(consumerId: string) {
    const consumer = await this.consumerRepository.findSummaryById(consumerId);
    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }
    return consumer;
  }

  async listConsumers(params?: AdminV2ConsumerListParams) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 20, 1), 100);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;
    const { items, total } = await this.consumerRepository.list(params, skip, pageSize);

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
    return this.consumerActivityQuery.getConsumerAuthHistory({
      consumerId,
      consumerEmail: consumer.email,
      page: params?.page,
      pageSize: params?.pageSize,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
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
    return this.consumerActivityQuery.getConsumerActionLog({
      consumerId,
      page: params?.page,
      pageSize: params?.pageSize,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      action: params?.action,
    });
  }

  async getConsumerCase(consumerId: string) {
    return this.consumerCaseQuery.getConsumerCase(consumerId);
  }

  async createNote(consumerId: string, adminId: string, content: string, meta?: RequestMeta) {
    const normalizedContent = validateNoteContent(content);
    return this.consumerNotesRepository.createWithAudit(consumerId, adminId, normalizedContent, meta);
  }

  async addFlag(consumerId: string, adminId: string, flag: string, reason?: string | null, meta?: RequestMeta) {
    const normalizedFlag = validateRequiredFlag(flag);
    const normalizedReason = normalizeOptionalReason(reason);
    const existing = await this.consumerFlagsRepository.findActiveByConsumerAndFlag(consumerId, normalizedFlag);
    if (existing) {
      return { ...existing, alreadyExisted: true };
    }

    return this.consumerFlagsRepository.createWithAudit(consumerId, adminId, normalizedFlag, normalizedReason, meta);
  }

  async removeFlag(consumerId: string, flagId: string, adminId: string, version: number, meta?: RequestMeta) {
    assertValidVersion(version);
    return this.consumerFlagsRepository.removeWithAudit(consumerId, flagId, adminId, version, meta);
  }

  async forceLogout(consumerId: string, adminId: string, body: { confirmed?: boolean }, meta?: RequestMeta) {
    assertConfirmedForceLogout(body.confirmed);
    const consumer = await this.requireConsumer(consumerId);
    return this.idempotency.execute({
      adminId,
      scope: `consumer-force-logout:${consumerId}`,
      key: meta?.idempotencyKey,
      payload: { consumerId, confirmed: true },
      execute: async () => {
        const activeSessionsBefore = await this.consumerRepository.countActiveSessions(consumerId);
        await this.consumerAdminAuthActions.revokeAllSessionsByConsumerIdAndAudit(consumerId, {
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_force_logout,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: buildForceLogoutAuditMetadata({ activeSessionsBefore, consumerEmail: consumer.email }),
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });
        return buildForceLogoutResult({ consumerId, activeSessionsBefore });
      },
    });
  }

  async suspendConsumer(consumerId: string, adminId: string, body: SuspendConsumerBody, meta?: RequestMeta) {
    assertConfirmedConsumerSuspension(body.confirmed);
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
          return buildAlreadySuspendedResult({
            consumerId,
            suspendedAt: current.suspendedAt,
            alreadySuspended: current.suspendedAt != null,
          });
        }

        await this.consumerAdminAuthActions.revokeAllSessionsByConsumerIdAndAudit(consumerId, {
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        let emailDispatched = false;
        try {
          emailDispatched = await this.consumerAdminAuthActions.sendConsumerSuspensionEmail(consumerId, reason);
        } catch {
          emailDispatched = false;
        }

        await this.adminActionAudit.record({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.consumer_suspend,
          resource: `consumer`,
          resourceId: consumerId,
          metadata: buildSuspendAuditMetadata({
            consumerEmail: consumer.email,
            reason,
            suspendedAt,
            emailDispatched,
          }),
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        return buildSuspendedResult({
          consumerId,
          suspendedAt,
          emailDispatched,
        });
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
          const emailDispatched = await this.consumerAdminAuthActions.resendSignupVerificationEmail(
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
          const outcome = await this.consumerAdminAuthActions.resendPasswordRecoveryEmail(consumerId, body.appScope);
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
          metadata: buildResendEmailAuditMetadata({
            consumerEmail: consumer.email,
            requestedEmailKind: result.requestedKind,
            dispatchedEmailKind: result.dispatchedKind,
            appScope: body.appScope,
          }),
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
