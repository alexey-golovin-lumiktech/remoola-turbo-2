import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { envs } from '../../envs';
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

  private getRateStaleCutoff(now: Date) {
    const hours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
    const ageMs = Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - ageMs);
  }

  private async getFailedScheduledConversionsSignal() {
    try {
      const count = await this.prisma.scheduledFxConversionModel.count({
        where: {
          deletedAt: null,
          status: $Enums.ScheduledFxConversionStatus.FAILED,
        },
      });

      return {
        label: `Failed scheduled FX`,
        count,
        phaseStatus: `live-actionable`,
        availability: `available`,
        href: `/exchange/scheduled?status=FAILED`,
      };
    } catch {
      return {
        label: `Failed scheduled FX`,
        count: null,
        phaseStatus: `live-actionable`,
        availability: `temporarily-unavailable`,
        href: `/exchange/scheduled?status=FAILED`,
      };
    }
  }

  private async getStaleExchangeRatesSignal(now: Date) {
    const staleCutoff = this.getRateStaleCutoff(now);
    try {
      const [result] = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM exchange_rate rate
        WHERE rate.deleted_at IS NULL
          AND rate.status = ${$Enums.ExchangeRateStatus.APPROVED}::exchange_rate_status_enum
          AND rate.effective_at <= ${now}
          AND (rate.expires_at IS NULL OR rate.expires_at > ${now})
          AND COALESCE(rate.fetched_at, rate.effective_at, rate.created_at) < ${staleCutoff}
      `);

      return {
        label: `Stale exchange rates`,
        count: result?.count ?? 0,
        phaseStatus: `live-actionable`,
        availability: `available`,
        href: `/exchange/rates?stale=true`,
      };
    } catch {
      return {
        label: `Stale exchange rates`,
        count: null,
        phaseStatus: `live-actionable`,
        availability: `temporarily-unavailable`,
        href: `/exchange/rates?stale=true`,
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
      failedScheduledConversions,
      staleExchangeRates,
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
      this.getFailedScheduledConversionsSignal(),
      this.getStaleExchangeRatesSignal(now),
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
        failedScheduledConversions,
        staleExchangeRates,
      },
    };
  }
}
