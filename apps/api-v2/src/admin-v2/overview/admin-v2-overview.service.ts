import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { AdminV2VerificationSlaService } from '../verification/admin-v2-verification-sla.service';

const OPEN_DISPUTE_STATUSES = [
  `open`,
  `needs_response`,
  `under_review`,
  `warning_needs_response`,
  `warning_under_review`,
] as const;

@Injectable()
export class AdminV2OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationSla: AdminV2VerificationSlaService,
  ) {}

  private async getPaymentRequestSignal(params: {
    label: string;
    href: string;
    where: Prisma.PaymentRequestModelWhereInput;
  }) {
    try {
      const count = await this.prisma.paymentRequestModel.count({
        where: params.where,
      });

      return {
        label: params.label,
        count,
        phaseStatus: `live-actionable`,
        availability: `available`,
        href: params.href,
      };
    } catch {
      return {
        label: params.label,
        count: null,
        phaseStatus: `live-actionable`,
        availability: `temporarily-unavailable`,
        href: params.href,
      };
    }
  }

  private async getOpenDisputesSignal() {
    try {
      const [result] = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM ledger_entry_dispute led
        INNER JOIN ledger_entry le ON le.id = led.ledger_entry_id
        WHERE le.deleted_at IS NULL
          AND COALESCE(led.metadata->>'status', led.metadata->>'disputeStatus', '') IN (${Prisma.join(
            OPEN_DISPUTE_STATUSES.map((status) => Prisma.sql`${status}`),
          )})
      `);

      return {
        label: `Open disputes`,
        count: result?.count ?? 0,
        phaseStatus: `live-actionable`,
        availability: `available`,
        href: `/ledger?view=disputes`,
      };
    } catch {
      return {
        label: `Open disputes`,
        count: null,
        phaseStatus: `live-actionable`,
        availability: `temporarily-unavailable`,
        href: `/ledger?view=disputes`,
      };
    }
  }

  async getSummary() {
    const now = new Date();
    const authWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pendingVerifications,
      suspiciousAuthEvents,
      recentAdminActions,
      overduePaymentRequestsSignal,
      uncollectiblePaymentRequestsSignal,
      slaSnapshot,
      openDisputes,
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
      this.getPaymentRequestSignal({
        label: `Overdue payment requests`,
        href: `/payments?overdue=true`,
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
      this.getPaymentRequestSignal({
        label: `Uncollectible payment requests`,
        href: `/payments?status=${$Enums.TransactionStatus.UNCOLLECTIBLE}`,
        where: {
          deletedAt: null,
          status: $Enums.TransactionStatus.UNCOLLECTIBLE,
        },
      }),
      this.verificationSla.getSnapshot(),
      this.getOpenDisputesSignal(),
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
        overduePaymentRequests: overduePaymentRequestsSignal,
        uncollectiblePaymentRequests: uncollectiblePaymentRequestsSignal,
        openDisputes,
      },
    };
  }
}
