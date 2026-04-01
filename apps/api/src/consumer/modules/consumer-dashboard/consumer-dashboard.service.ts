import { Injectable, Logger } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { DashboardData, ActivityItem, ComplianceTask, PendingRequest, QuickDoc } from './dtos/dashboard-data.dto';
import { PrismaService } from '../../../shared/prisma.service';
import { buildConsumerVerificationState } from '../../../shared-common';
import { normalizeConsumerFacingTransactionStatus } from '../../status-compat';

@Injectable()
export class ConsumerDashboardService {
  private readonly logger = new Logger(ConsumerDashboardService.name);
  constructor(private prisma: PrismaService) {}

  /** Main entry point */
  async getDashboardData(consumerId: string): Promise<DashboardData> {
    try {
      const [summary, pendingRequests, activity, tasks, quickDocs] = await Promise.all([
        this.buildSummary(consumerId),
        this.buildPendingRequests(consumerId),
        this.buildActivity(consumerId),
        this.buildTasks(consumerId),
        this.buildQuickDocs(consumerId),
      ]);
      const verification = await this.buildVerification(consumerId);

      const response = {
        summary,
        pendingRequests,
        activity,
        tasks,
        quickDocs,
        verification,
      };

      return response;
    } catch (error) {
      this.logger.error(`Failed to build dashboard data`, {
        consumerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async buildSummary(consumerId: string) {
    const completedStatus = $Enums.TransactionStatus.COMPLETED;
    const [balanceResult, activeRequests, lastPayment] = await Promise.all([
      // Balance from effective status (latest outcome or entry.status) — append-only outcomes
      // Uses LATERAL join pattern (raw-sql-issues.md)
      // for optimal performance with index on ledger_entry_outcome(ledger_entry_id, created_at DESC)
      this.prisma.$queryRaw<Array<{ balance: string | null }>>(Prisma.sql`
        SELECT COALESCE(SUM(le.amount), 0) AS balance
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT o.status FROM ledger_entry_outcome o
          WHERE o.ledger_entry_id = le.id
          ORDER BY o.created_at DESC LIMIT 1
        ) latest ON true
        WHERE le.consumer_id::text = ${consumerId}
          AND (COALESCE(latest.status, le.status))::text = ${completedStatus}
          AND le.deleted_at IS NULL
      `),

      // Active payment requests count
      this.prisma.paymentRequestModel.count({
        where: {
          OR: [{ payerId: consumerId }, { requesterId: consumerId }],
          status: { not: `COMPLETED` },
        },
      }),

      // Last payment made
      this.prisma.ledgerEntryModel.findFirst({
        where: { consumerId, deletedAt: null },
        orderBy: { createdAt: `desc` },
        select: { createdAt: true },
      }),
    ]);

    // Ledger amount is stored in minor units (cents); same as BalanceCalculationService / payments balance.
    const balanceSum = balanceResult[0]?.balance != null ? Number(balanceResult[0].balance) : 0;
    return {
      balanceCents: Math.round(balanceSum),

      activeRequests,
      lastPaymentAt: lastPayment?.createdAt ?? null,
    };
  }

  private async buildPendingRequests(consumerId: string): Promise<PendingRequest[]> {
    const paymentRequests = await this.prisma.paymentRequestModel.findMany({
      where: {
        payerId: consumerId,
        status: { not: `COMPLETED` },
      },
      include: {
        requester: {
          select: { email: true },
        },
      },
    });

    return paymentRequests.map((paymentRequest) => ({
      id: paymentRequest.id,
      counterpartyName: paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``,
      amount: Number(paymentRequest.amount),
      currencyCode: paymentRequest.currencyCode,
      status: normalizeConsumerFacingTransactionStatus(paymentRequest.status),
      lastActivityAt: paymentRequest.updatedAt,
    }));
  }

  private async buildActivity(consumerId: string): Promise<ActivityItem[]> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: {
        personalDetails: true,
        paymentMethods: true,
        consumerResources: {
          include: {
            resource: true,
          },
        },
      },
    });
    const verification = buildConsumerVerificationState(consumer);

    const items: ActivityItem[] = [];

    if (verification.effectiveVerified) {
      items.push({
        id: `kyc`,
        label: `Identity verified`,
        createdAt: verification.verifiedAt ?? verification.updatedAt ?? new Date().toISOString(),
        kind: `kyc_completed`,
      });
    } else if (verification.status === `requires_input` || verification.status === `more_info`) {
      items.push({
        id: `kyc_attention`,
        label: `Verification needs attention`,
        createdAt: verification.updatedAt ?? new Date().toISOString(),
        kind: `kyc_requires_input`,
      });
    } else if (verification.status === `pending_submission`) {
      items.push({
        id: `kyc_started`,
        label: `Verification started`,
        createdAt: verification.startedAt ?? new Date().toISOString(),
        kind: `kyc_started`,
      });
    } else {
      items.push({
        id: `kyc_pending`,
        label: `Identity verification pending`,
        createdAt: new Date().toISOString(),
        kind: `kyc_in_review`,
      });
    }

    // W-9
    const w9 = consumer.consumerResources.find(
      (cr) =>
        cr.resource.originalName.toLowerCase().includes(`w9`) || cr.resource.originalName.toLowerCase().includes(`w-9`),
    );

    if (w9) {
      items.push({
        id: `w9`,
        label: `W-9 pack ready`,
        createdAt: w9.resource.createdAt?.toISOString() ?? new Date().toISOString(),
        kind: `w9_ready`,
      });
    }

    // Bank
    if (consumer.paymentMethods.length > 0) {
      items.push({
        id: `bank`,
        label: `Bank account added`,
        createdAt: consumer.paymentMethods[0].createdAt?.toISOString() ?? new Date().toISOString(),
        kind: `bank_added`,
      });
    } else {
      items.push({
        id: `bank_pending`,
        label: `Bank details pending`,
        createdAt: new Date().toISOString(),
        kind: `bank_pending`,
      });
    }

    return items.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
  }

  private async buildTasks(consumerId: string): Promise<ComplianceTask[]> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: {
        personalDetails: true,
        paymentMethods: true,
        consumerResources: {
          include: {
            resource: true,
          },
        },
      },
    });
    const verification = buildConsumerVerificationState(consumer);

    const hasW9 = consumer.consumerResources.some((consumerResource) =>
      consumerResource.resource.originalName.toLowerCase().includes(`w9`),
    );

    return [
      {
        id: `kyc`,
        label: `Complete KYC`,
        completed: verification.effectiveVerified,
      },
      {
        id: `profile`,
        label: `Complete your profile`,
        completed: verification.profileComplete,
      },
      {
        id: `w9`,
        label: `Upload W-9 form`,
        completed: hasW9,
      },
      {
        id: `bank`,
        label: `Add bank account`,
        completed: consumer.paymentMethods.filter((x) => x.type === `BANK_ACCOUNT`).length > 0,
      },
    ];
  }

  private async buildVerification(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });

    return buildConsumerVerificationState(consumer);
  }

  private async buildQuickDocs(consumerId: string): Promise<QuickDoc[]> {
    const consumerResources = await this.prisma.consumerResourceModel.findMany({
      where: { consumerId },
      include: {
        resource: true,
      },
      orderBy: {
        createdAt: `desc`,
      },
      take: 5,
    });

    return consumerResources.map((consumerResource) => ({
      id: consumerResource.resource.id,
      name: consumerResource.resource.originalName,
      createdAt: consumerResource.resource.createdAt?.toISOString() ?? ``,
    }));
  }
}
