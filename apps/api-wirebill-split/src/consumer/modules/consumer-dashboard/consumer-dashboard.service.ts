import { Injectable } from '@nestjs/common';

import {
  DashboardDataDto,
  ActivityItemDto,
  ComplianceTaskDto,
  PendingRequestDto,
  QuickDocDto,
} from './dtos/dashboard-data.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerDashboardService {
  constructor(private prisma: PrismaService) {}

  /** Main entry point */
  async getDashboardData(consumerId: string): Promise<DashboardDataDto> {
    const [summary, pendingRequests, activity, tasks, quickDocs] = await Promise.all([
      this.buildSummary(consumerId),
      this.buildPendingRequests(consumerId),
      this.buildActivity(consumerId),
      this.buildTasks(consumerId),
      this.buildQuickDocs(consumerId),
    ]);

    const response = {
      summary,
      pendingRequests,
      activity,
      tasks,
      quickDocs,
    };

    console.log(`\n************************************`);
    console.log(`response`, response);
    console.log(`************************************\n`);
    return response;
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  private async buildSummary(consumerId: string) {
    const [balance, activeRequests, lastPayment] = await Promise.all([
      // Completed transactions → balance
      this.prisma.transactionModel.aggregate({
        where: { consumerId, status: `COMPLETED` },
        _sum: { originAmount: true },
      }),

      // Active payment requests count
      this.prisma.paymentRequestModel.count({
        where: {
          OR: [{ payerId: consumerId }, { requesterId: consumerId }],
          status: { not: `COMPLETED` },
        },
      }),

      // Last payment made
      this.prisma.transactionModel.findFirst({
        where: { consumerId },
        orderBy: { createdAt: `desc` },
        select: { createdAt: true },
      }),
    ]);

    return {
      balanceCents: balance._sum.originAmount ? Number(balance._sum.originAmount) * 100 : 0,

      activeRequests,
      lastPaymentAt: lastPayment?.createdAt ?? null,
    };
  }

  // ============================================================
  // PENDING PAYMENT REQUESTS
  // ============================================================

  private async buildPendingRequests(consumerId: string): Promise<PendingRequestDto[]> {
    const requests = await this.prisma.paymentRequestModel.findMany({
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

    return requests.map((req) => ({
      id: req.id,
      counterpartyName: req.requester.email,
      amount: Number(req.amount),
      currencyCode: req.currencyCode,
      status: req.status,
      lastActivityAt: req.updatedAt,
    }));
  }

  // ============================================================
  // ACTIVITY TIMELINE
  // ============================================================

  private async buildActivity(consumerId: string): Promise<ActivityItemDto[]> {
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

    const items: ActivityItemDto[] = [];

    // KYC
    if (consumer.personalDetails) {
      items.push({
        id: `kyc`,
        label: `KYC Completed`,
        createdAt: consumer.personalDetails.createdAt?.toISOString() ?? new Date().toISOString(),
        kind: `kyc_completed`,
      });
    } else {
      items.push({
        id: `kyc_pending`,
        label: `KYC in review`,
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

  // ============================================================
  // COMPLIANCE TASKS
  // ============================================================

  private async buildTasks(consumerId: string): Promise<ComplianceTaskDto[]> {
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

    const hasW9 = consumer.consumerResources.some((cr) => cr.resource.originalName.toLowerCase().includes(`w9`));

    return [
      {
        id: `kyc`,
        label: `Complete KYC`,
        completed: !!consumer.personalDetails,
      },
      {
        id: `w9`,
        label: `Upload W-9 form`,
        completed: hasW9,
      },
      {
        id: `bank`,
        label: `Add bank account`,
        completed: consumer.paymentMethods.length > 0,
      },
    ];
  }

  // ============================================================
  // QUICK DOCS
  // ============================================================

  private async buildQuickDocs(consumerId: string): Promise<QuickDocDto[]> {
    const items = await this.prisma.consumerResourceModel.findMany({
      where: { consumerId },
      include: {
        resource: true,
      },
      orderBy: {
        createdAt: `desc`,
      },
      take: 5,
    });

    return items.map((cr) => ({
      id: cr.resource.id,
      name: cr.resource.originalName,
      createdAt: cr.resource.createdAt?.toISOString() ?? ``,
    }));
  }
}
