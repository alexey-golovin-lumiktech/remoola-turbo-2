import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import {
  deriveVersion,
  normalizeReason,
  type RequestMeta,
  type VerificationDecision,
  VERIFICATION_DECISION_CONFIG,
} from './admin-v2-verification-policy';
import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { AdminV2VerificationRepository } from './admin-v2-verification.repository';
import { AdminNotificationMailingService } from '../../shared/admin-notification-mailing.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

type VerificationDecisionEmailer = Pick<AdminNotificationMailingService, `sendAdminV2VerificationDecisionEmail`>;

function toNullableIso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null;
}

@Injectable()
export class AdminV2VerificationDecisionService {
  private readonly logger = new Logger(AdminV2VerificationDecisionService.name);

  constructor(
    private readonly repository: AdminV2VerificationRepository,
    private readonly slaService: AdminV2VerificationSlaService,
    private readonly idempotency: AdminV2IdempotencyService,
    @Inject(AdminNotificationMailingService)
    private readonly adminNotificationMailingService: VerificationDecisionEmailer,
  ) {}

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
        const decisionConfig = VERIFICATION_DECISION_CONFIG[decision];
        const result = await this.repository.applyDecision({
          consumerId,
          adminId,
          reason,
          expectedVersion,
          notificationType: decisionConfig.notificationType,
          actionName: decisionConfig.actionName,
          nextState: decisionConfig.nextState,
          meta,
        });

        let notificationSent = false;
        if (decisionConfig.notificationType === `email` && decision !== `flag`) {
          notificationSent = await this.adminNotificationMailingService.sendAdminV2VerificationDecisionEmail({
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
          verificationUpdatedAt: toNullableIso(result.updatedConsumer.verificationUpdatedAt),
          updatedAt: result.updatedConsumer.updatedAt.toISOString(),
          version: deriveVersion(result.updatedConsumer.updatedAt),
          ...(decisionConfig.notificationType
            ? { notification: { type: decisionConfig.notificationType, sent: notificationSent } }
            : {}),
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
}
