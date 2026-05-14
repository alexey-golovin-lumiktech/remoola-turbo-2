import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerPaymentsIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConsumerEmailById(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  findActiveRecipientByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: {
        email: { equals: email.trim().toLowerCase(), mode: `insensitive` },
        deletedAt: null,
      },
    });
  }

  findTransferRecipient(where: Prisma.ConsumerModelWhereInput) {
    return this.prisma.consumerModel.findFirst({ where });
  }

  findActiveBankPayoutMethod(consumerId: string, paymentMethodId: string) {
    return this.prisma.paymentMethodModel.findFirst({
      where: {
        id: paymentMethodId.trim(),
        consumerId,
        deletedAt: null,
      },
      select: { id: true, type: true },
    });
  }
}
