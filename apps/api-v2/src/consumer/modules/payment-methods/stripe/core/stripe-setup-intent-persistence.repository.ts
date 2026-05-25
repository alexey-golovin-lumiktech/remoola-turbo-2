import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PrismaService } from '../../../../../shared/prisma.service';

@Injectable()
export class StripeSetupIntentPersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async persistSetupIntentPaymentMethod(params: {
    consumerId: string;
    consumerEmail: string;
    stripePaymentMethodId: string;
    stripeFingerprint: string | null;
    brand: string;
    last4: string;
    expMonth: number | null | undefined;
    expYear: number | null | undefined;
    billingDetails?: {
      email?: string | null;
      name?: string | null;
      phone?: string | null;
    } | null;
  }) {
    const { consumerId, consumerEmail, stripePaymentMethodId, stripeFingerprint, brand, last4, expMonth, expYear } =
      params;
    const billing = params.billingDetails;

    const billingDetails = await this.prisma.billingDetailsModel.create({
      data: {
        email: billing?.email ?? consumerEmail,
        name: billing?.name ?? null,
        phone: billing?.phone ?? null,
      },
    });

    const hasDefault = await this.prisma.paymentMethodModel.count({
      where: {
        consumerId,
        deletedAt: null,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        defaultSelected: true,
      },
    });

    return this.prisma.paymentMethodModel.create({
      data: {
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        stripePaymentMethodId,
        stripeFingerprint,
        defaultSelected: hasDefault === 0,
        brand,
        last4,
        serviceFee: 0,
        expMonth: expMonth ? String(expMonth).padStart(2, `0`) : null,
        expYear: expYear ? String(expYear) : null,
        billingDetailsId: billingDetails.id,
        consumerId,
      },
    });
  }
}
