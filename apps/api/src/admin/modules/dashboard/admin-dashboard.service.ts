import { Injectable } from '@nestjs/common';

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

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

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
      this.prisma.paymentRequestModel.groupBy({
        by: [`status`],
        _count: { status: true },
      }),
    ]);

    const statusTotals = paymentStatusCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count.status;
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
    const grouped = await this.prisma.paymentRequestModel.groupBy({
      by: [`status`],
      _count: {
        status: true,
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        status: `asc`,
      },
    });

    return grouped.map((row) => ({
      status: row.status,
      count: row._count.status,
      totalAmount: row._sum.amount ? row._sum.amount.toString() : `0`,
    }));
  }

  async getRecentPaymentRequests() {
    const since = new Date(Date.now() - DAY_IN_MS);

    return this.prisma.paymentRequestModel.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: `desc` },
      take: RECENT_PAYMENT_REQUEST_LIMIT,
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
      },
    });
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
      select: { id: true, requesterId: true, createdAt: true },
    });

    for (const request of missingLedgerRequests) {
      anomalies.push({
        id: `missing:${request.id}`,
        type: `missing_ledger_entry`,
        description: `Completed payment request has no ledger entries.`,
        paymentRequestId: request.id,
        consumerId: request.requesterId,
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
          in: [`USER_PAYMENT`, `USER_PAYMENT_REVERSAL`],
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
        description: `User payment ledger entry missing payment request linkage.`,
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
      const paymentEntries = request.ledgerEntries.filter((entry) => entry.type === `USER_PAYMENT`);

      const matchingEntries = paymentEntries.filter(
        (entry) => Math.abs(Math.abs(Number(entry.amount)) - requestAmount) <= AMOUNT_MISMATCH_TOLERANCE,
      );

      if (matchingEntries.length === 0) {
        anomalies.push({
          id: `amount:${request.id}`,
          type: `amount_mismatch`,
          description: `No USER_PAYMENT ledger entry matches request amount ${requestAmount.toFixed(2)}.`,
          paymentRequestId: request.id,
          consumerId: request.requesterId,
          createdAt: request.createdAt.toISOString(),
        });
        continue;
      }

      const hasPositive = matchingEntries.some((entry) => Number(entry.amount) > 0);
      const hasNegative = matchingEntries.some((entry) => Number(entry.amount) < 0);

      if (!hasPositive || !hasNegative) {
        anomalies.push({
          id: `amount:${request.id}`,
          type: `amount_mismatch`,
          description: `Expected both debit and credit USER_PAYMENT entries for ${requestAmount.toFixed(2)}.`,
          paymentRequestId: request.id,
          consumerId: request.requesterId,
          createdAt: request.createdAt.toISOString(),
        });
      }
    }

    const statusMismatchRequests = await this.prisma.paymentRequestModel.findMany({
      where: {
        status: `COMPLETED`,
        ledgerEntries: {
          some: { status: { not: `COMPLETED` } },
        },
      },
      orderBy: { createdAt: `desc` },
      take: STATUS_MISMATCH_LIMIT,
      select: { id: true, requesterId: true, createdAt: true },
    });

    for (const request of statusMismatchRequests) {
      anomalies.push({
        id: `status:${request.id}`,
        type: `status_inconsistency`,
        description: `Ledger entries do not align with completed request status.`,
        paymentRequestId: request.id,
        consumerId: request.requesterId,
        createdAt: request.createdAt.toISOString(),
      });
    }

    const prematureLedgerRequests = await this.prisma.paymentRequestModel.findMany({
      where: {
        status: { not: `COMPLETED` },
        ledgerEntries: {
          some: { status: `COMPLETED` },
        },
      },
      orderBy: { createdAt: `desc` },
      take: PREMATURE_LEDGER_LIMIT,
      select: { id: true, requesterId: true, createdAt: true },
    });

    for (const request of prematureLedgerRequests) {
      anomalies.push({
        id: `premature:${request.id}`,
        type: `premature_ledger_entry`,
        description: `Non-completed request has completed ledger entries.`,
        paymentRequestId: request.id,
        consumerId: request.requesterId,
        createdAt: request.createdAt.toISOString(),
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
