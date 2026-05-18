import { Inject, Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { AdminV2AdminAuditTrailRepository } from './admin-v2-admin-audit-trail.repository';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import { RecoveryMailingService } from '../../shared/recovery-mailing.service';
import { SignupMailingService } from '../../shared/signup-mailing.service';

type AdminPasswordResetEmailer = Pick<RecoveryMailingService, `sendAdminV2PasswordResetEmail`>;
type AdminInvitationEmailer = Pick<SignupMailingService, `sendInvitationEmail`>;

@Injectable()
export class AdminV2AdminAuditTrail {
  private readonly logger = new Logger(AdminV2AdminAuditTrail.name);

  constructor(
    private readonly repository: AdminV2AdminAuditTrailRepository,
    @Inject(RecoveryMailingService)
    private readonly recoveryMailingService: AdminPasswordResetEmailer,
    @Inject(SignupMailingService)
    private readonly signupMailingService: AdminInvitationEmailer,
    private readonly links: AdminV2AdminLinks,
  ) {}

  async sendAdminV2PasswordResetEmail(params: {
    email: string;
    token: string;
    auditId: string;
    metadata: Prisma.InputJsonValue;
  }): Promise<{ notificationSent: boolean; deliveryStatus: `sent` | `failed` }> {
    const notificationSent = await this.recoveryMailingService.sendAdminV2PasswordResetEmail({
      email: params.email,
      forgotPasswordLink: this.links.buildPasswordResetUrl(params.token),
    });
    await this.repository.updateNotificationStatus({
      auditId: params.auditId,
      metadata: {
        ...(params.metadata as Record<string, unknown>),
        notificationSent,
        notificationType: `email`,
        deliveryStatus: notificationSent ? `sent` : `failed`,
      } as Prisma.InputJsonValue,
    });
    return { notificationSent, deliveryStatus: notificationSent ? `sent` : `failed` };
  }

  async sendAdminV2PasswordResetEmailNotification(params: { email: string; token: string }): Promise<boolean> {
    return this.recoveryMailingService.sendAdminV2PasswordResetEmail({
      email: params.email,
      forgotPasswordLink: this.links.buildPasswordResetUrl(params.token),
    });
  }

  async trySendInvitationEmail(params: { email: string; signupLink: string }): Promise<boolean> {
    try {
      await this.signupMailingService.sendInvitationEmail(params);
      return true;
    } catch {
      return false;
    }
  }

  async recordAdminActionAudit(params: {
    adminId: string;
    action: string;
    resourceId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      await this.repository.createAdminAuditEntry({
        adminId: params.adminId,
        action: params.action,
        resourceId: params.resourceId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record admin compatibility audit ${JSON.stringify({
          action: params.action,
          resourceId: params.resourceId,
          message: error instanceof Error ? error.message : String(error),
        })}`,
      );
    }
  }
}
