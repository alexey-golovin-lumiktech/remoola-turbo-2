import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../shared/prisma.service';

@Injectable()
export class StripeCustomerAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConsumer(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
    });
  }

  async claimStripeCustomerId(consumerId: string, stripeCustomerId: string) {
    const claimed = await this.prisma.consumerModel.updateMany({
      where: { id: consumerId, stripeCustomerId: null },
      data: { stripeCustomerId },
    });

    return claimed.count === 1;
  }

  async findStripeCustomerId(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { stripeCustomerId: true },
    });
  }
}
