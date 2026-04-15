import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2VerificationSlaService } from '../verification/admin-v2-verification-sla.service';

@Injectable()
export class AdminV2OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationSla: AdminV2VerificationSlaService,
  ) {}

  async getSummary() {
    const now = new Date();
    const authWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pendingVerifications,
      suspiciousAuthEvents,
      recentAdminActions,
      overduePaymentRequests,
      uncollectiblePaymentRequests,
      slaSnapshot,
    ] = await Promise.all([
      this.prisma.consumerModel.count({
        where: {
          deletedAt: null,
          verificationStatus: {
            in: [
              $Enums.VerificationStatus.PENDING,
              $Enums.VerificationStatus.MORE_INFO,
              $Enums.VerificationStatus.FLAGGED,
            ],
          },
        },
      }),
      this.prisma.authAuditLogModel.count({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          event: AUTH_AUDIT_EVENTS.login_failure,
          createdAt: { gte: authWindowStart },
        },
      }),
      this.prisma.adminActionAuditLogModel.findMany({
        orderBy: { createdAt: `desc` },
        take: 5,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          admin: {
            select: {
              email: true,
            },
          },
        },
      }),
      this.prisma.paymentRequestModel.count({
        where: {
          deletedAt: null,
          dueDate: { lt: now },
          status: {
            in: [
              $Enums.TransactionStatus.WAITING,
              $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
              $Enums.TransactionStatus.PENDING,
            ],
          },
        },
      }),
      this.prisma.paymentRequestModel.count({
        where: {
          deletedAt: null,
          status: $Enums.TransactionStatus.UNCOLLECTIBLE,
        },
      }),
      this.verificationSla.getSnapshot(),
    ]);

    return {
      computedAt: now.toISOString(),
      signals: {
        pendingVerifications: {
          label: `Pending verifications`,
          count: pendingVerifications,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/verification`,
          slaBreachedCount: slaSnapshot.breachedConsumerIds.size,
        },
        recentAdminActions: {
          label: `Recent admin actions`,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/audit/admin-actions`,
          items: recentAdminActions.map((item) => ({
            id: item.id,
            action: item.action,
            resource: item.resource,
            resourceId: item.resourceId,
            adminEmail: item.admin.email,
            createdAt: item.createdAt,
          })),
        },
        suspiciousAuthEvents: {
          label: `Suspicious auth events`,
          count: suspiciousAuthEvents,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/audit/auth?event=${AUTH_AUDIT_EVENTS.login_failure}&dateFrom=${authWindowStart.toISOString()}`,
        },
        overduePaymentRequests: {
          label: `Overdue payment requests`,
          count: overduePaymentRequests,
          phaseStatus: `count-only`,
          availability: `available`,
        },
        uncollectiblePaymentRequests: {
          label: `Uncollectible payment requests`,
          count: uncollectiblePaymentRequests,
          phaseStatus: `count-only`,
          availability: `available`,
        },
        openDisputes: {
          label: `Open disputes`,
          count: null,
          phaseStatus: `count-only`,
          availability: `temporarily-unavailable`,
        },
      },
    };
  }
}
