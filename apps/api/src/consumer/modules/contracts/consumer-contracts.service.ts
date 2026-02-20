import { Injectable } from '@nestjs/common';

import { ConsumerContractItem } from './dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerContractsService {
  constructor(private prisma: PrismaService) {}

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
        OR: [{ payer: { email: { in: emails } } }, { requester: { email: { in: emails } } }],
      },
      include: {
        payer: true,
        requester: true,
        ledgerEntries: {
          orderBy: { createdAt: `desc` },
          take: 1,
        },
        attachments: true,
      },
    });

    const items: ConsumerContractItem[] = contacts.map((contact) => {
      const filteredPaymentRequests = paymentRequests.filter(
        (paymentRequest) =>
          paymentRequest.payer?.email === contact.email || paymentRequest.requester?.email === contact.email,
      );

      const lastReq = filteredPaymentRequests.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];

      return {
        id: contact.id,
        name: contact.name ?? contact.email,
        email: contact.email,
        lastRequestId: lastReq?.id ?? null,
        lastStatus: lastReq?.status ?? null,
        lastActivity: lastReq?.updatedAt ?? null,
        docs: filteredPaymentRequests.reduce((sum, paymentRequest) => sum + paymentRequest.attachments.length, 0),
      };
    });

    return { items, total, page: safePage, pageSize: safePageSize };
  }
}
