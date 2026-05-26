import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { type Cache } from 'cache-manager';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaTransactionRunner } from '../../../../shared/prisma-transaction.runner';
import { PrismaService } from '../../../../shared/prisma.service';
import { type CreateManualPaymentMethod, type UpdatePaymentMethod } from '../dto/payment-method.dto';

const PAYMENT_METHODS_LIST_CACHE_TTL_MS = 30_000;

type ConsumerPaymentMethodList = Prisma.PaymentMethodModelGetPayload<{ include: { billingDetails: true } }>[];

@Injectable()
export class ConsumerPaymentMethodsRepository {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner = new PrismaTransactionRunner(prisma),
  ) {}

  async listForConsumer(consumerId: string) {
    const cacheKey = this.buildListCacheKey(consumerId);
    const cached = await this.cacheManager.get<ConsumerPaymentMethodList>(cacheKey);
    if (cached) {
      return cached;
    }

    const paymentMethods = await this.prisma.paymentMethodModel.findMany({
      where: { consumerId, deletedAt: null },
      include: { billingDetails: true },
      orderBy: { createdAt: `desc` },
    });

    await this.cacheManager.set(cacheKey, paymentMethods, PAYMENT_METHODS_LIST_CACHE_TTL_MS);
    return paymentMethods;
  }

  async invalidateListForConsumer(consumerId: string): Promise<void> {
    await this.cacheManager.del(this.buildListCacheKey(consumerId));
  }

  async createManualPaymentMethod(consumerId: string, body: CreateManualPaymentMethod) {
    return this.transactions.run(async (tx) => {
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

  async findActiveByIdForConsumer(consumerId: string, id: string) {
    return this.prisma.paymentMethodModel.findFirst({
      where: { id, consumerId, deletedAt: null },
      include: { billingDetails: true },
    });
  }

  async clearDefaultForType(consumerId: string, type: $Enums.PaymentMethodType) {
    await this.prisma.paymentMethodModel.updateMany({
      where: { consumerId, deletedAt: null, type },
      data: { defaultSelected: false },
    });
  }

  async createBillingDetails(body: UpdatePaymentMethod) {
    return this.prisma.billingDetailsModel.create({
      data: {
        name: body.billingName ?? null,
        email: body.billingEmail ?? null,
        phone: body.billingPhone ?? null,
      },
    });
  }

  async attachBillingDetails(paymentMethodId: string, billingDetailsId: string) {
    await this.prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: { billingDetailsId },
    });
  }

  async updateBillingDetails(billingDetailsId: string, body: UpdatePaymentMethod) {
    await this.prisma.billingDetailsModel.update({
      where: { id: billingDetailsId },
      data: {
        name: body.billingName ?? undefined,
        email: body.billingEmail ?? undefined,
        phone: body.billingPhone ?? undefined,
      },
    });
  }

  async updatePaymentMethodDefault(paymentMethodId: string, defaultSelected: boolean) {
    return this.prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: { defaultSelected },
    });
  }

  async softDeleteAndPromoteFallback(params: {
    consumerId: string;
    paymentMethodId: string;
    type: $Enums.PaymentMethodType;
    wasDefault: boolean;
  }) {
    await this.transactions.run(async (tx) => {
      await tx.paymentMethodModel.update({
        where: { id: params.paymentMethodId },
        data: { deletedAt: new Date(), defaultSelected: false },
      });

      if (!params.wasDefault) return;

      const fallback = await tx.paymentMethodModel.findFirst({
        where: { consumerId: params.consumerId, deletedAt: null, type: params.type },
        orderBy: { createdAt: `desc` },
        select: { id: true },
      });

      if (!fallback) return;

      await tx.paymentMethodModel.update({
        where: { id: fallback.id },
        data: { defaultSelected: true },
      });
    });
  }

  private buildListCacheKey(consumerId: string) {
    return `consumer-payment-methods:list:${consumerId}`;
  }
}
