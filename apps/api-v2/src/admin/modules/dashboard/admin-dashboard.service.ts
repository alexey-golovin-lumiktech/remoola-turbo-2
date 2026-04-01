import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RECENT_PAYMENT_REQUEST_LIMIT = 30;
const DUPLICATE_IDEMPOTENCY_LIMIT = 25;
const MISSING_LEDGER_LIMIT = 20;
const DANGLING_LEDGER_LIMIT = 20;
const UNLINKED_PAYMENT_LEDGER_LIMIT = 20;
const STATUS_MISMATCH_LIMIT = 20;
const PREMATURE_LEDGER_LIMIT = 20;
const LEDGER_SUM_CHECK_LIMIT = 300;
const AMOUNT_MISMATCH_TOLERANCE = 0.01;
const MAX_ANOMALIES = 50;
const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;
const PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
  $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
] as const;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private deriveEffectivePaymentRequestStatus(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!paymentRequest) return null;
    const latestEntry = [...(paymentRequest.ledgerEntries ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    return latestEntry ? this.getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
  }

  private async getEffectivePaymentRequestStatusSummary() {
    return this.prisma.$queryRaw<
      Array<{ status: string; count: bigint; totalAmount: Prisma.Decimal | null }>
    >(Prisma.sql`
      SELECT
        COALESCE(latest_request_status.status, pr.status::text) AS status,
        COUNT(*)::bigint AS count,
        COALESCE(SUM(pr.amount), 0)::numeric AS "totalAmount"
      FROM payment_request pr
      LEFT JOIN LATERAL (
        SELECT (COALESCE(latest.status, le.status))::text AS status
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT o.status
          FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC
          LIMIT 1
        ) latest ON true
        WHERE le.payment_request_id = pr.id
          AND le.deleted_at IS NULL
          AND le.type::text IN (${Prisma.join([...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES], `, `)})
        ORDER BY le.created_at DESC
        LIMIT 1
      ) latest_request_status ON true
      GROUP BY COALESCE(latest_request_status.status, pr.status::text)
      ORDER BY COALESCE(latest_request_status.status, pr.status::text) ASC
    `);
  }

  async getStats() {
    const [totalConsumers, verifiedConsumers] = await Promise.all([
      this.prisma.consumerModel.count(),
      this.prisma.consumerModel.count({
        where: {
          verified: true,
          legalVerified: true,
        },
      }),
    ]);

    const [totalPaymentRequests, totalLedgerEntries, paymentStatusCounts] = await Promise.all([
      this.prisma.paymentRequestModel.count(),
      this.prisma.ledgerEntryModel.count(),
      this.getEffectivePaymentRequestStatusSummary(),
    ]);

    const statusTotals = paymentStatusCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});

    const ledgerAnomalies = await this.getLedgerAnomalies();

    return {
      consumers: {
        total: totalConsumers,
        verified: verifiedConsumers,
        unverified: Math.max(totalConsumers - verifiedConsumers, 0),
      },
      paymentRequests: {
        total: totalPaymentRequests,
        byStatus: statusTotals,
      },
      ledger: {
        total: totalLedgerEntries,
        anomalies: ledgerAnomalies.length,
      },
    };
  }

  async getPaymentRequestsByStatus() {
    const grouped = await this.getEffectivePaymentRequestStatusSummary();

    return grouped.map((row) => ({
      status: row.status as $Enums.TransactionStatus,
      count: Number(row.count),
      totalAmount: row.totalAmount ? row.totalAmount.toString() : `0`,
    }));
  }

  async getRecentPaymentRequests() {
    const since = new Date(Date.now() - DAY_IN_MS);

    const items = await this.prisma.paymentRequestModel.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: `desc` },
      take: RECENT_PAYMENT_REQUEST_LIMIT,
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        ledgerEntries: {
          where: { type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] } },
          orderBy: { createdAt: `desc` },
          take: 4,
          select: {
            status: true,
            createdAt: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });

    return items.map(({ ledgerEntries, ...item }) => ({
      ...item,
      status: this.deriveEffectivePaymentRequestStatus({ ...item, ledgerEntries }) ?? item.status,
    }));
  }

  async getLedgerAnomalies() {
    const anomalies: Array<{
      id: string;
      type:
        | `duplicate`
        | `missing_ledger_entry`
        | `dangling_ledger_entry`
        | `unlinked_payment_ledger_entry`
        | `amount_mismatch`
        | `status_inconsistency`
        | `premature_ledger_entry`;
      description: string;
      paymentRequestId?: string;
      consumerId: string;
      createdAt: string;
    }> = [];

    const duplicateIdempotencyGroups = await this.prisma.ledgerEntryModel.groupBy({
      by: [`idempotencyKey`],
      where: {
        idempotencyKey: { not: null },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        idempotencyKey: `asc`,
      },
    });

    const duplicateKeys = duplicateIdempotencyGroups
      .filter((group) => group._count._all > 1)
      .slice(0, DUPLICATE_IDEMPOTENCY_LIMIT);

    for (const duplicate of duplicateKeys) {
      const entry = await this.prisma.ledgerEntryModel.findFirst({
        where: { idempotencyKey: duplicate.idempotencyKey ?? undefined },
        select: { id: true, consumerId: true, paymentRequestId: true, createdAt: true },
      });

      if (!entry) continue;

      anomalies.push({
        id: `duplicate:${entry.id}`,
        type: `duplicate`,
        description: `Multiple ledger entries share idempotency key ${duplicate.idempotencyKey}.`,
        paymentRequestId: entry.paymentRequestId ?? undefined,
        consumerId: entry.consumerId,
        createdAt: entry.createdAt.toISOString(),
      });
    }

    const missingLedgerRequests = await this.prisma.paymentRequestModel.findMany({
      where: {
        status: `COMPLETED`,
        ledgerEntries: {
          none: {},
        },
      },
      orderBy: { createdAt: `desc` },
      take: MISSING_LEDGER_LIMIT,
      select: { id: true, requesterId: true, payerId: true, createdAt: true },
    });

    for (const request of missingLedgerRequests) {
      anomalies.push({
        id: `missing:${request.id}`,
        type: `missing_ledger_entry`,
        description: `Completed payment request has no ledger entries.`,
        paymentRequestId: request.id,
        consumerId: request.requesterId ?? request.payerId ?? undefined,
        createdAt: request.createdAt.toISOString(),
      });
    }

    const danglingLedgerEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId: { not: null },
      },
      include: {
        paymentRequest: { select: { id: true } },
      },
      orderBy: { createdAt: `desc` },
      take: DANGLING_LEDGER_LIMIT * 2,
    });

    for (const entry of danglingLedgerEntries.filter((item) => !item.paymentRequest).slice(0, DANGLING_LEDGER_LIMIT)) {
      anomalies.push({
        id: `dangling:${entry.id}`,
        type: `dangling_ledger_entry`,
        description: `Ledger entry references a missing payment request.`,
        paymentRequestId: entry.paymentRequestId ?? undefined,
        consumerId: entry.consumerId,
        createdAt: entry.createdAt.toISOString(),
      });
    }

    const unlinkedPaymentLedgerEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId: null,
        type: {
          in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES, ...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES],
        },
      },
      orderBy: { createdAt: `desc` },
      take: UNLINKED_PAYMENT_LEDGER_LIMIT,
      select: { id: true, consumerId: true, createdAt: true },
    });

    for (const entry of unlinkedPaymentLedgerEntries) {
      anomalies.push({
        id: `unlinked:${entry.id}`,
        type: `unlinked_payment_ledger_entry`,
        description: `Payment-settlement ledger entry missing payment request linkage.`,
        consumerId: entry.consumerId,
        createdAt: entry.createdAt.toISOString(),
      });
    }

    const paymentRequestsWithLedger = await this.prisma.paymentRequestModel.findMany({
      where: {
        status: `COMPLETED`,
        ledgerEntries: {
          some: {},
        },
      },
      orderBy: { createdAt: `desc` },
      take: LEDGER_SUM_CHECK_LIMIT,
      select: {
        id: true,
        amount: true,
        requesterId: true,
        payerId: true,
        createdAt: true,
        ledgerEntries: {
          select: {
            amount: true,
            type: true,
          },
        },
      },
    });

    for (const request of paymentRequestsWithLedger) {
      const requestAmount = Number(request.amount);
      const settlementEntries = request.ledgerEntries.filter((entry) =>
        PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES.includes(
          entry.type as (typeof PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES)[number],
        ),
      );

      const matchingEntries = settlementEntries.filter(
        (entry) => Math.abs(Math.abs(Number(entry.amount)) - requestAmount) <= AMOUNT_MISMATCH_TOLERANCE,
      );

      const consumerId = request.requesterId ?? request.payerId ?? undefined;

      if (matchingEntries.length === 0) {
        anomalies.push({
          id: `amount:${request.id}`,
          type: `amount_mismatch`,
          description: `No settlement ledger entry matches request amount ${requestAmount.toFixed(2)}.`,
          paymentRequestId: request.id,
          consumerId,
          createdAt: request.createdAt.toISOString(),
        });
        continue;
      }

      const hasPositive = matchingEntries.some((entry) => Number(entry.amount) > 0);
      const hasNegative = matchingEntries.some((entry) => Number(entry.amount) < 0);
      const hasExternalFundingCredit = matchingEntries.some(
        (entry) => entry.type === $Enums.LedgerEntryType.USER_DEPOSIT && Number(entry.amount) > 0,
      );

      if ((!hasPositive || !hasNegative) && !hasExternalFundingCredit) {
        anomalies.push({
          id: `amount:${request.id}`,
          type: `amount_mismatch`,
          description: `Settlement ledger shape does not match completed request amount ${requestAmount.toFixed(2)}.`,
          paymentRequestId: request.id,
          consumerId,
          createdAt: request.createdAt.toISOString(),
        });
      }
    }

    // Use effective status (latest outcome or entry.status) so append-only outcomes are respected
    const statusMismatchRows = await this.prisma.$queryRaw<
      Array<{ id: string; requester_id: string | null; payer_id: string | null; created_at: Date }>
    >(Prisma.sql`
      SELECT DISTINCT pr.id, pr.requester_id, pr.payer_id, pr.created_at
      FROM payment_request pr
      INNER JOIN ledger_entry le ON le.payment_request_id = pr.id AND le.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE pr.status::text = ${$Enums.TransactionStatus.COMPLETED}
        AND (COALESCE(latest.status, le.status))::text <> ${$Enums.TransactionStatus.COMPLETED}
      ORDER BY pr.created_at DESC
      LIMIT ${STATUS_MISMATCH_LIMIT}
    `);

    for (const request of statusMismatchRows) {
      anomalies.push({
        id: `status:${request.id}`,
        type: `status_inconsistency`,
        description: `Ledger entries do not align with completed request status.`,
        paymentRequestId: request.id,
        consumerId: request.requester_id ?? request.payer_id ?? undefined,
        createdAt: new Date(request.created_at).toISOString(),
      });
    }

    const prematureRows = await this.prisma.$queryRaw<
      Array<{ id: string; requester_id: string | null; payer_id: string | null; created_at: Date }>
    >(Prisma.sql`
      SELECT DISTINCT pr.id, pr.requester_id, pr.payer_id, pr.created_at
      FROM payment_request pr
      INNER JOIN ledger_entry le ON le.payment_request_id = pr.id AND le.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE pr.status::text <> ${$Enums.TransactionStatus.COMPLETED}
        AND (COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.COMPLETED}
      ORDER BY pr.created_at DESC
      LIMIT ${PREMATURE_LEDGER_LIMIT}
    `);

    for (const request of prematureRows) {
      anomalies.push({
        id: `premature:${request.id}`,
        type: `premature_ledger_entry`,
        description: `Non-completed request has completed ledger entries.`,
        paymentRequestId: request.id,
        consumerId: request.requester_id ?? request.payer_id ?? undefined,
        createdAt: new Date(request.created_at).toISOString(),
      });
    }

    return anomalies.slice(0, MAX_ANOMALIES);
  }

  async getVerificationQueue() {
    const consumers = await this.prisma.consumerModel.findMany({
      where: {
        OR: [
          { verified: { not: true } },
          { legalVerified: { not: true } },
          { verificationStatus: { in: [`MORE_INFO`, `FLAGGED`, `REJECTED`] } },
        ],
      },
      orderBy: { createdAt: `asc` },
      take: 50,
      include: {
        personalDetails: true,
        organizationDetails: true,
        _count: {
          select: { consumerResources: true },
        },
      },
    });

    return consumers.map((consumer) => {
      const { _count, ...rest } = consumer;
      return {
        ...rest,
        documentsCount: _count.consumerResources,
      };
    });
  }
}
