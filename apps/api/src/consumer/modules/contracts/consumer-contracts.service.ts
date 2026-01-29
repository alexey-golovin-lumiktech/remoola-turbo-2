import { Injectable } from '@nestjs/common';

import { ConsumerContractItem } from './dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerContractsService {
  constructor(private prisma: PrismaService) {}

  async getContracts(consumerId: string): Promise<ConsumerContractItem[]> {
    // 1. Load contacts for this consumer
    const contacts = await this.prisma.contactModel.findMany({
      where: { consumerId },
    });

    const emails = contacts.map((contact) => contact.email);

    // 2. Load payment requests involving these emails
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

    // 3. Build contract rows
    return contacts.map((contact) => {
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
  }
}
