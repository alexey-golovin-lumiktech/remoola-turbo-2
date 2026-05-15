import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

type BacklogSnapshot = {
  count: number;
  oldestAt: Date | null;
};

export type EmailPatternRow = {
  action: string;
  count: number;
  lastFailedAt: Date | null;
};

type RateSnapshot = {
  count: number;
  oldestReferenceAt: Date | null;
};

@Injectable()
export class AdminV2SystemQuery {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestProcessedWebhookAt(): Promise<Date | null> {
    const latestProcessed = await this.prisma.stripeWebhookEventModel.aggregate({
      _max: { createdAt: true },
    });

    return latestProcessed._max.createdAt ?? null;
  }

  countExpiredResetPasswords(now: Date) {
    return this.prisma.resetPasswordModel.count({
      where: {
        deletedAt: null,
        expiredAt: { lt: now },
      },
    });
  }

  countExpiredOauthStates(now: Date) {
    return this.prisma.oauthStateModel.count({
      where: {
        expiresAt: { lt: now },
      },
    });
  }

  async listEmailDeliveryIssuePatterns(windowStart: Date): Promise<EmailPatternRow[]> {
    return this.prisma.$queryRaw<EmailPatternRow[]>(Prisma.sql`
      SELECT
        log.action AS "action",
        COUNT(*)::int AS "count",
        MAX(log.created_at) AS "lastFailedAt"
      FROM admin_action_audit_log AS log
      WHERE log.created_at >= ${windowStart}
        AND COALESCE(log.metadata->>'notificationType', '') = 'email'
        AND COALESCE(log.metadata->>'notificationSent', 'false') = 'false'
      GROUP BY log.action
      ORDER BY COUNT(*) DESC, MAX(log.created_at) DESC
    `);
  }

  async getStripeCheckoutLag(): Promise<BacklogSnapshot> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(entry.created_at) AS "oldestAt"
      FROM ledger_entry AS entry
      LEFT JOIN LATERAL (
        SELECT outcome.status, outcome.source, outcome.external_id
        FROM ledger_entry_outcome AS outcome
        WHERE outcome.ledger_entry_id = entry.id
        ORDER BY outcome.created_at DESC, outcome.id DESC
        LIMIT 1
      ) AS latest ON TRUE
      WHERE entry.deleted_at IS NULL
        AND entry.type::text = 'USER_PAYMENT'
        AND COALESCE(latest.status::text, entry.status::text) = 'WAITING'
        AND latest.source = 'stripe'
        AND latest.external_id LIKE 'cs\\_%' ESCAPE '\\'
    `);

    return {
      count: result?.count ?? 0,
      oldestAt: result?.oldestAt ?? null,
    };
  }

  async getStripeReversalLag(): Promise<BacklogSnapshot> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(entry.created_at) AS "oldestAt"
      FROM ledger_entry AS entry
      LEFT JOIN LATERAL (
        SELECT outcome.status
        FROM ledger_entry_outcome AS outcome
        WHERE outcome.ledger_entry_id = entry.id
        ORDER BY outcome.created_at DESC, outcome.id DESC
        LIMIT 1
      ) AS latest ON TRUE
      WHERE entry.deleted_at IS NULL
        AND entry.type::text IN ('USER_PAYMENT_REVERSAL', 'USER_DEPOSIT_REVERSAL')
        AND entry.stripe_id IS NOT NULL
        AND entry.created_by <> 'stripe'
        AND COALESCE(latest.status::text, entry.status::text) = 'PENDING'
    `);

    return {
      count: result?.count ?? 0,
      oldestAt: result?.oldestAt ?? null,
    };
  }

  async getOverdueScheduledConversions(now: Date): Promise<BacklogSnapshot> {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(conversion.execute_at) AS "oldestAt"
      FROM scheduled_fx_conversion AS conversion
      WHERE conversion.deleted_at IS NULL
        AND conversion.status::text = 'PENDING'
        AND conversion.execute_at < ${now}
    `);

    return {
      count: result?.count ?? 0,
      oldestAt: result?.oldestAt ?? null,
    };
  }

  async getStaleRateSnapshot(params: { now: Date; staleCutoff: Date }): Promise<RateSnapshot> {
    const { now, staleCutoff } = params;
    const [result] = await this.prisma.$queryRaw<Array<{ count: number; oldestReferenceAt: Date | null }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        MIN(COALESCE(rate.fetched_at, rate.effective_at, rate.created_at)) AS "oldestReferenceAt"
      FROM exchange_rate AS rate
      WHERE rate.deleted_at IS NULL
        AND rate.status::text = 'APPROVED'
        AND rate.effective_at <= ${now}
        AND (rate.expires_at IS NULL OR rate.expires_at > ${now})
        AND COALESCE(rate.fetched_at, rate.effective_at, rate.created_at) < ${staleCutoff}
    `);

    return {
      count: result?.count ?? 0,
      oldestReferenceAt: result?.oldestReferenceAt ?? null,
    };
  }
}
