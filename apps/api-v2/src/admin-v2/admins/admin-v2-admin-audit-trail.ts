import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { AdminV2AdminLinks } from './admin-v2-admin-links';
import { MailingService } from '../../shared/mailing.service';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2AdminAuditTrail {
  private readonly logger = new Logger(AdminV2AdminAuditTrail.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly links: AdminV2AdminLinks,
  ) {}

  async sendAdminV2PasswordResetEmail(params: {
    email: string;
    token: string;
    auditId: string;
    metadata: Prisma.InputJsonValue;
  }): Promise<{ notificationSent: boolean; deliveryStatus: `sent` | `failed` }> {
    const notificationSent = await this.mailingService.sendAdminV2PasswordResetEmail({
      email: params.email,
      forgotPasswordLink: this.links.buildPasswordResetUrl(params.token),
    });
    await this.prisma.adminActionAuditLogModel.update({
      where: { id: params.auditId },
      data: {
        metadata: {
          ...(params.metadata as Record<string, unknown>),
          notificationSent,
          notificationType: `email`,
          deliveryStatus: notificationSent ? `sent` : `failed`,
        } as Prisma.InputJsonValue,
      },
    });
    return { notificationSent, deliveryStatus: notificationSent ? `sent` : `failed` };
  }

  async trySendInvitationEmail(params: { email: string; signupLink: string }): Promise<boolean> {
    try {
      await this.mailingService.sendInvitationEmail(params);
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
      await this.prisma.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          resource: `admin`,
          resourceId: params.resourceId,
          metadata: params.metadata ?? Prisma.JsonNull,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
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
