import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { DashboardData, ActivityItem, ComplianceTask, PendingRequest, QuickDoc } from './dtos/dashboard-data.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerDashboardService {
  constructor(private prisma: PrismaService) {}

  /** Main entry point */
  async getDashboardData(consumerId: string): Promise<DashboardData> {
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

    return response;
  }

  private async buildSummary(consumerId: string) {
    const [balance, activeRequests, lastPayment] = await Promise.all([
      // Completed transactions → balance
      this.prisma.ledgerEntryModel.aggregate({
        where: { consumerId, status: `COMPLETED`, deletedAt: null },
        _sum: { amount: true },
      }),

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

    return {
      balanceCents: balance._sum.amount ? Number(balance._sum.amount) * 100 : 0,

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
      counterpartyName: paymentRequest.requester.email,
      amount: Number(paymentRequest.amount),
      currencyCode: paymentRequest.currencyCode,
      status: paymentRequest.status,
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

    const items: ActivityItem[] = [];

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

    const hasW9 = consumer.consumerResources.some((consumerResource) =>
      consumerResource.resource.originalName.toLowerCase().includes(`w9`),
    );

    const isIndividualContractor =
      consumer.accountType === $Enums.AccountType.CONTRACTOR &&
      consumer.contractorKind === $Enums.ContractorKind.INDIVIDUAL;
    const pd = consumer.personalDetails;
    const profileComplete =
      !!pd &&
      (isIndividualContractor
        ? !!pd.legalStatus && !!pd.taxId?.trim() && !!pd.passportOrIdNumber?.trim()
        : !!pd.taxId?.trim() && !!pd.phoneNumber?.trim());

    return [
      {
        id: `kyc`,
        label: `Complete KYC`,
        completed: !!consumer.personalDetails,
      },
      {
        id: `profile`,
        label: `Complete your profile`,
        completed: profileComplete,
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
