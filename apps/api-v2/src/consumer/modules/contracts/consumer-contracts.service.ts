import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerContractItem } from './dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerContractsService {
  constructor(private prisma: PrismaService) {}

  private normalizeEmail(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? ``;
  }

  private getEffectiveLedgerStatus(
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!entry) return null;
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getEffectivePaymentRequestStatus(
    paymentRequestStatus: $Enums.TransactionStatus,
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus {
    return this.getEffectiveLedgerStatus(entry) ?? paymentRequestStatus;
  }

  async getContracts(
    consumerId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{ items: ConsumerContractItem[]; total: number; page: number; pageSize: number }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));

    const [total, contacts] = await Promise.all([
      this.prisma.contactModel.count({ where: { consumerId } }),
      this.prisma.contactModel.findMany({
        where: { consumerId },
        orderBy: { updatedAt: `desc` },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    const emails = contacts.map((contact) => contact.email);
    if (emails.length === 0) {
      return { items: [], total, page: safePage, pageSize: safePageSize };
    }

    const paymentRequests = await this.prisma.paymentRequestModel.findMany({
      where: {
        OR: [
          { payer: { email: { in: emails } } },
          { requester: { email: { in: emails } } },
          { payerEmail: { in: emails } },
          { requesterEmail: { in: emails } },
        ],
      },
      include: {
        payer: true,
        requester: true,
        ledgerEntries: {
          where: { consumerId },
          orderBy: { createdAt: `desc` },
          take: 1,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
        attachments: true,
      },
    });

    const items: ConsumerContractItem[] = contacts.map((contact) => {
      const normalizedContactEmail = this.normalizeEmail(contact.email);
      const filteredPaymentRequests = paymentRequests.filter((paymentRequest) => {
        const payerEmail = this.normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
        const requesterEmail = this.normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
        return payerEmail === normalizedContactEmail || requesterEmail === normalizedContactEmail;
      });

      const lastReq = [...filteredPaymentRequests].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
      const latestConsumerLedgerEntry = lastReq?.ledgerEntries[0];

      return {
        id: contact.id,
        name: contact.name ?? contact.email,
        email: contact.email,
        lastRequestId: lastReq?.id ?? null,
        lastStatus: lastReq
          ? this.getEffectivePaymentRequestStatus(lastReq.status, latestConsumerLedgerEntry).toLowerCase()
          : null,
        lastActivity: lastReq?.updatedAt ?? null,
        docs: filteredPaymentRequests.reduce((sum, paymentRequest) => sum + paymentRequest.attachments.length, 0),
      };
    });

    return { items, total, page: safePage, pageSize: safePageSize };
  }
}
