import { BadRequestException, Injectable } from '@nestjs/common';

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
    const methods = await this.prisma.paymentMethodModel.findMany({
      where: { consumerId, deletedAt: null },
      include: { billingDetails: true },
      orderBy: { createdAt: `desc` },
    });

    const items: PaymentMethodItem[] = methods.map((m) => {
      let billingDetails;
      if (m.billingDetails) {
        billingDetails = {
          id: m.billingDetails.id,
          email: m.billingDetails.email,
          name: m.billingDetails.name,
        };
      }

      return {
        id: m.id,
        type: m.type,
        brand: m.brand,
        last4: m.last4,
        expMonth: m.expMonth,
        expYear: m.expYear,
        defaultSelected: m.defaultSelected,
        billingDetails: billingDetails || null,
      };
    });

    return { items };
  }

  // 3) Manual bank/card create
  async createManual(consumerId: string, dto: CreateManualPaymentMethod) {
    const billingDetails = await this.prisma.billingDetailsModel.create({
      data: {
        email: dto.billingEmail ?? null,
        name: dto.billingName ?? null,
        phone: dto.billingPhone ?? null,
      },
    });

    const hasDefault = await this.prisma.paymentMethodModel.count({
      where: { consumerId, deletedAt: null, defaultSelected: true },
    });

    return this.prisma.paymentMethodModel.create({
      data: {
        type: dto.type,
        defaultSelected: hasDefault === 0,
        brand: dto.brand,
        last4: dto.last4.slice(-4),
        serviceFee: 0,
        expMonth: dto.expMonth ?? null,
        expYear: dto.expYear ?? null,
        billingDetailsId: billingDetails.id,
        consumerId,
      },
    });
  }

  // 4) Update (e.g. defaultSelected, billing details)
  async update(consumerId: string, id: string, dto: UpdatePaymentMethod) {
    const pm = await this.prisma.paymentMethodModel.findFirst({
      where: { id, consumerId, deletedAt: null },
      include: { billingDetails: true },
    });

    if (!pm) throw new BadRequestException(`Payment method not found`);

    if (dto.defaultSelected) {
      // unset all others, set this one
      await this.prisma.paymentMethodModel.updateMany({
        where: { consumerId, deletedAt: null },
        data: { defaultSelected: false },
      });
    }

    if (dto.billingName || dto.billingEmail || dto.billingPhone) {
      if (!pm.billingDetailsId) {
        const bd = await this.prisma.billingDetailsModel.create({
          data: {
            name: dto.billingName ?? null,
            email: dto.billingEmail ?? null,
            phone: dto.billingPhone ?? null,
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
            name: dto.billingName ?? undefined,
            email: dto.billingEmail ?? undefined,
            phone: dto.billingPhone ?? undefined,
          },
        });
      }
    }

    return this.prisma.paymentMethodModel.update({
      where: { id: pm.id },
      data: {
        defaultSelected: dto.defaultSelected !== undefined ? dto.defaultSelected : pm.defaultSelected,
      },
    });
  }

  // 5) Delete (soft or hard)
  async delete(consumerId: string, id: string) {
    const pm = await this.prisma.paymentMethodModel.findFirst({
      where: { id, consumerId, deletedAt: null },
    });

    if (!pm) return { success: true };

    // soft delete
    await this.prisma.paymentMethodModel.update({
      where: { id },
      data: { deletedAt: new Date(), defaultSelected: false },
    });

    return { success: true };
  }
}
