import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from './prisma.service';

export type AdminActionAuditParams = {
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Action names for admin action audit (fintech compliance). */
export const ADMIN_ACTION_AUDIT_ACTIONS = {
  payment_refund: `payment_refund`,
  payment_chargeback: `payment_chargeback`,
  admin_password_change: `admin_password_change`,
  admin_delete: `admin_delete`,
  admin_restore: `admin_restore`,
  consumer_verification_update: `consumer_verification_update`,
  exchange_rate_create: `exchange_rate_create`,
  exchange_rate_update: `exchange_rate_update`,
  exchange_rate_delete: `exchange_rate_delete`,
  exchange_rule_run: `exchange_rule_run`,
  exchange_scheduled_cancel: `exchange_scheduled_cancel`,
  exchange_scheduled_execute: `exchange_scheduled_execute`,
} as const;

@Injectable()
export class AdminActionAuditService {
  private readonly logger = new Logger(AdminActionAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a sensitive admin action. Append-only; never throws on failure so it does not break the main flow.
   */
  async record(params: AdminActionAuditParams): Promise<void> {
    const { adminId, action, resource, resourceId, metadata, ipAddress, userAgent } = params;
    try {
      await this.prisma.adminActionAuditLogModel.create({
        data: {
          adminId,
          action,
          resource,
          resourceId: resourceId ?? null,
          metadata: metadata ?? Prisma.JsonNull,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(`AdminActionAudit: failed to record`, {
        action,
        resource,
        message: err instanceof Error ? err.message : `Unknown`,
      });
    }
  }
}
