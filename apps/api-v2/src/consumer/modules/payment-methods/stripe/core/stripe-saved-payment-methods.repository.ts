import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../shared/prisma.service';

@Injectable()
export class StripeSavedPaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveSavedPaymentMethod(consumerId: string, paymentMethodId: string) {
    return this.prisma.paymentMethodModel.findFirst({
      where: {
        id: paymentMethodId,
        consumerId,
        deletedAt: null,
      },
      include: { billingDetails: true },
    });
  }

  async invalidateNonReusableSavedMethod(paymentMethodId: string) {
    await this.prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: {
        deletedAt: new Date(),
        stripePaymentMethodId: null,
      },
    });
  }
}
