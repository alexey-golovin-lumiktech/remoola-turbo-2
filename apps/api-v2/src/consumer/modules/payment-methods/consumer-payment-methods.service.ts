import { BadRequestException, Injectable } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import {
  CreateManualPaymentMethod,
  PaymentMethodItem,
  PaymentMethodsResponse,
  UpdatePaymentMethod,
} from './dto/payment-method.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(consumerId: string): Promise<PaymentMethodsResponse> {
    const paymentMethods = await this.prisma.paymentMethodModel.findMany({
      where: { consumerId, deletedAt: null },
      include: { billingDetails: true },
      orderBy: { createdAt: `desc` },
    });

    const items: PaymentMethodItem[] = paymentMethods.map((paymentMethod) => {
      let billingDetails;
      if (paymentMethod.billingDetails) {
        billingDetails = {
          id: paymentMethod.billingDetails.id,
          email: paymentMethod.billingDetails.email,
          name: paymentMethod.billingDetails.name,
          phone: paymentMethod.billingDetails.phone,
        };
      }

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4,
        expMonth: paymentMethod.expMonth,
        expYear: paymentMethod.expYear,
        defaultSelected: paymentMethod.defaultSelected,
        reusableForPayerPayments: paymentMethod.type === `CREDIT_CARD` && Boolean(paymentMethod.stripePaymentMethodId),
        billingDetails: billingDetails || null,
      };
    });

    return { items };
  }

  // 3) Manual bank/card create
  async createManual(consumerId: string, body: CreateManualPaymentMethod) {
    return this.prisma.$transaction(async (tx) => {
      const billingDetails = await tx.billingDetailsModel.create({
        data: {
          email: body.billingEmail ?? null,
          name: body.billingName ?? null,
          phone: body.billingPhone ?? null,
        },
      });

      const hasDefault = await tx.paymentMethodModel.count({
        where: { consumerId, deletedAt: null, type: body.type, defaultSelected: true },
      });
      const shouldBeDefault = body.defaultSelected === true || hasDefault === 0;

      if (shouldBeDefault) {
        await tx.paymentMethodModel.updateMany({
          where: { consumerId, deletedAt: null, type: body.type },
          data: { defaultSelected: false },
        });
      }

      return tx.paymentMethodModel.create({
        data: {
          type: body.type,
          defaultSelected: shouldBeDefault,
          brand: body.brand,
          last4: body.last4.slice(-4),
          serviceFee: 0,
          expMonth: body.expMonth ?? null,
          expYear: body.expYear ?? null,
          billingDetailsId: billingDetails.id,
          consumerId,
          stripePaymentMethodId: body.stripePaymentMethodId ?? null,
        },
      });
    });
  }

  // 4) Update (e.g. defaultSelected, billing details)
  async update(consumerId: string, id: string, body: UpdatePaymentMethod) {
    const pm = await this.prisma.paymentMethodModel.findFirst({
      where: { id, consumerId, deletedAt: null },
      include: { billingDetails: true },
    });

    if (!pm) throw new BadRequestException(errorCodes.PAYMENT_METHOD_NOT_FOUND);

    if (body.defaultSelected) {
      await this.prisma.paymentMethodModel.updateMany({
        where: { consumerId, deletedAt: null, type: pm.type },
        data: { defaultSelected: false },
      });
    }

    if (body.billingName || body.billingEmail || body.billingPhone) {
      if (!pm.billingDetailsId) {
        const bd = await this.prisma.billingDetailsModel.create({
          data: {
            name: body.billingName ?? null,
            email: body.billingEmail ?? null,
            phone: body.billingPhone ?? null,
          },
        });

        await this.prisma.paymentMethodModel.update({
          where: { id: pm.id },
          data: { billingDetailsId: bd.id },
        });
      } else {
        await this.prisma.billingDetailsModel.update({
          where: { id: pm.billingDetailsId },
          data: {
            name: body.billingName ?? undefined,
            email: body.billingEmail ?? undefined,
            phone: body.billingPhone ?? undefined,
          },
        });
      }
    }

    return this.prisma.paymentMethodModel.update({
      where: { id: pm.id },
      data: {
        defaultSelected: body.defaultSelected !== undefined ? body.defaultSelected : pm.defaultSelected,
      },
    });
  }

  // 5) Delete (soft or hard)
  async delete(consumerId: string, id: string) {
    const pm = await this.prisma.paymentMethodModel.findFirst({
      where: { id, consumerId, deletedAt: null },
    });

    if (!pm) return { success: true };

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMethodModel.update({
        where: { id },
        data: { deletedAt: new Date(), defaultSelected: false },
      });

      if (!pm.defaultSelected) return;

      const fallback = await tx.paymentMethodModel.findFirst({
        where: { consumerId, deletedAt: null, type: pm.type },
        orderBy: { createdAt: `desc` },
        select: { id: true },
      });

      if (!fallback) return;

      await tx.paymentMethodModel.update({
        where: { id: fallback.id },
        data: { defaultSelected: true },
      });
    });

    return { success: true };
  }
}
