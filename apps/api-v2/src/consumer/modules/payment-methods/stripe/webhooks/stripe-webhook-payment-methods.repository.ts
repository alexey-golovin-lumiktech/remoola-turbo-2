import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../../../../shared/prisma-transaction.runner';
import { PrismaService } from '../../../../../shared/prisma.service';

type CheckoutPaymentMethodData = {
  consumerId: string;
  type: $Enums.PaymentMethodType;
  stripePaymentMethodId: string;
  stripeFingerprint: string | null;
  brand: string;
  last4: string;
  expMonth?: string;
  expYear?: string;
  billingDetails?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
};

@Injectable()
export class StripeWebhookPaymentMethodsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner = new PrismaTransactionRunner(prisma),
  ) {}

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

  async findConsumersWithPaymentMethods() {
    return this.prisma.consumerModel.findMany({
      include: { paymentMethods: true },
    });
  }

  async markPaymentMethodUnusable(paymentMethodId: string) {
    await this.prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: {
        deletedAt: new Date(),
        stripePaymentMethodId: null,
      },
    });
  }

  async storeCheckoutPaymentMethod(data: CheckoutPaymentMethodData) {
    const duplicateWhere = this.buildDuplicateWhere(data);

    try {
      await this.transactions.run(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(
            hashtext((${data.consumerId} || ':' || ${data.type} || ':checkout-payment-method')::text)::bigint
          )
        `);

        const existingPaymentMethod = await tx.paymentMethodModel.findFirst({
          where: duplicateWhere,
        });

        if (existingPaymentMethod) {
          return;
        }

        let billingDetails;
        if (data.billingDetails) {
          billingDetails = await tx.billingDetailsModel.create({
            data: {
              email: data.billingDetails.email || null,
              name: data.billingDetails.name || null,
              phone: data.billingDetails.phone || null,
            },
          });
        }

        const hasDefault = await tx.paymentMethodModel.count({
          where: {
            consumerId: data.consumerId,
            deletedAt: null,
            type: data.type,
            defaultSelected: true,
          },
        });
        const shouldBeDefault = hasDefault === 0;

        if (shouldBeDefault) {
          await tx.paymentMethodModel.updateMany({
            where: {
              consumerId: data.consumerId,
              deletedAt: null,
              type: data.type,
            },
            data: { defaultSelected: false },
          });
        }

        await tx.paymentMethodModel.create({
          data: {
            type: data.type,
            stripePaymentMethodId: data.stripePaymentMethodId,
            stripeFingerprint: data.stripeFingerprint,
            defaultSelected: shouldBeDefault,
            brand: data.brand,
            last4: data.last4,
            expMonth: data.expMonth,
            expYear: data.expYear,
            serviceFee: 0,
            billingDetailsId: billingDetails?.id || null,
            consumerId: data.consumerId,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        const existingPaymentMethod = await this.prisma.paymentMethodModel.findFirst({
          where: duplicateWhere,
          select: { id: true },
        });
        if (existingPaymentMethod) {
          return;
        }
      }
      throw error;
    }
  }

  private buildDuplicateWhere(data: CheckoutPaymentMethodData): Prisma.PaymentMethodModelWhereInput {
    if (data.stripeFingerprint) {
      return {
        consumerId: data.consumerId,
        deletedAt: null,
        OR: [{ stripePaymentMethodId: data.stripePaymentMethodId }, { stripeFingerprint: data.stripeFingerprint }],
      };
    }

    return {
      consumerId: data.consumerId,
      deletedAt: null,
      stripePaymentMethodId: data.stripePaymentMethodId,
    };
  }
}
