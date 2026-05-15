import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

const OPEN_DISPUTE_STATUSES = [
  `open`,
  `needs_response`,
  `under_review`,
  `warning_needs_response`,
  `warning_under_review`,
] as const;

@Injectable()
export class AdminV2OverviewQuery {
  constructor(private readonly prisma: PrismaService) {}

  countPendingVerifications() {
    return this.prisma.consumerModel.count({
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
    });
  }

  countSuspiciousAuthEvents(authWindowStart: Date) {
    return this.prisma.authAuditLogModel.count({
      where: {
        identityType: AUTH_IDENTITY_TYPES.consumer,
        event: AUTH_AUDIT_EVENTS.login_failure,
        createdAt: { gte: authWindowStart },
      },
    });
  }

  listRecentAdminActions(limit: number) {
    return this.prisma.adminActionAuditLogModel.findMany({
      orderBy: { createdAt: `desc` },
      take: limit,
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
    });
  }

  countOverduePaymentRequests(now: Date) {
    return this.prisma.paymentRequestModel.count({
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
    });
  }

  countUncollectiblePaymentRequests() {
    return this.prisma.paymentRequestModel.count({
      where: {
        deletedAt: null,
        status: $Enums.TransactionStatus.UNCOLLECTIBLE,
      },
    });
  }

  async countOpenDisputes(): Promise<number> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM ledger_entry_dispute led
      INNER JOIN ledger_entry le ON le.id = led.ledger_entry_id
      WHERE le.deleted_at IS NULL
        AND COALESCE(led.metadata->>'status', led.metadata->>'disputeStatus', '') IN (${Prisma.join(
          OPEN_DISPUTE_STATUSES.map((status) => Prisma.sql`${status}`),
        )})
    `);

    return result?.count ?? 0;
  }

  countFailedScheduledConversions() {
    return this.prisma.scheduledFxConversionModel.count({
      where: {
        deletedAt: null,
        status: $Enums.ScheduledFxConversionStatus.FAILED,
      },
    });
  }

  async countStaleExchangeRates(params: { now: Date; staleCutoff: Date }): Promise<number> {
    const { now, staleCutoff } = params;
    const [result] = await this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM exchange_rate rate
      WHERE rate.deleted_at IS NULL
        AND rate.status = ${$Enums.ExchangeRateStatus.APPROVED}::exchange_rate_status_enum
        AND rate.effective_at <= ${now}
        AND (rate.expires_at IS NULL OR rate.expires_at > ${now})
        AND COALESCE(rate.fetched_at, rate.effective_at, rate.created_at) < ${staleCutoff}
    `);

    return result?.count ?? 0;
  }
}
