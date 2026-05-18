import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { type Cache } from 'cache-manager';

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

const OVERVIEW_CACHE_TTL_MS = 30_000;

@Injectable()
export class AdminV2OverviewQuery {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  countPendingVerifications() {
    return this.getCached(`admin-v2-overview:pending-verifications`, () =>
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
    );
  }

  countSuspiciousAuthEvents(authWindowStart: Date) {
    return this.getCached(`admin-v2-overview:suspicious-auth:${this.toCacheBucket(authWindowStart)}`, () =>
      this.prisma.authAuditLogModel.count({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          event: AUTH_AUDIT_EVENTS.login_failure,
          createdAt: { gte: authWindowStart },
        },
      }),
    );
  }

  listRecentAdminActions(limit: number) {
    return this.getCached(`admin-v2-overview:recent-admin-actions:${limit}`, () =>
      this.prisma.adminActionAuditLogModel.findMany({
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
      }),
    );
  }

  countOverduePaymentRequests(now: Date) {
    return this.getCached(`admin-v2-overview:overdue-payment-requests:${this.toCacheBucket(now)}`, () =>
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
    );
  }

  countUncollectiblePaymentRequests() {
    return this.getCached(`admin-v2-overview:uncollectible-payment-requests`, () =>
      this.prisma.paymentRequestModel.count({
        where: {
          deletedAt: null,
          status: $Enums.TransactionStatus.UNCOLLECTIBLE,
        },
      }),
    );
  }

  async countOpenDisputes(): Promise<number> {
    return this.getCached(`admin-v2-overview:open-disputes`, async () => {
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
    });
  }

  countFailedScheduledConversions() {
    return this.getCached(`admin-v2-overview:failed-scheduled-conversions`, () =>
      this.prisma.scheduledFxConversionModel.count({
        where: {
          deletedAt: null,
          status: $Enums.ScheduledFxConversionStatus.FAILED,
        },
      }),
    );
  }

  async countStaleExchangeRates(params: { now: Date; staleCutoff: Date }): Promise<number> {
    const { now, staleCutoff } = params;
    const cacheKey =
      `admin-v2-overview:stale-exchange-rates:${this.toCacheBucket(now)}:` + `${this.toCacheBucket(staleCutoff)}`;
    return this.getCached(cacheKey, async () => {
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
    });
  }

  private async getCached<T>(cacheKey: string, load: () => Promise<T>): Promise<T> {
    const cached = await this.cacheManager.get<T>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = await load();
    await this.cacheManager.set(cacheKey, result, OVERVIEW_CACHE_TTL_MS);
    return result;
  }

  private toCacheBucket(date: Date) {
    return new Date(Math.floor(date.getTime() / OVERVIEW_CACHE_TTL_MS) * OVERVIEW_CACHE_TTL_MS).toISOString();
  }
}
