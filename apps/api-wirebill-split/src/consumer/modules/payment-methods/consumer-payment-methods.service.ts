import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database';

import {
  ConfirmStripeSetupIntent,
  CreateManualPaymentMethod,
  PaymentMethodItem,
  PaymentMethodsResponse,
  UpdatePaymentMethod,
} from './dto/payment-method.dto';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerPaymentMethodsService {
  constructor(
    @InjectStripe() private stripe: Stripe,
    private prisma: PrismaService,
  ) {}

  async getPaymentMethodMetadata(paymentMethodId: string) {
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    return {
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month?.toString(),
      expYear: pm.card?.exp_year?.toString(),
    };
  }

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

  private async ensureStripeCustomer(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) throw new BadRequestException(`Consumer not found`);

    if (consumer.stripeCustomerId) {
      return { consumer, customerId: consumer.stripeCustomerId };
    }

    const customer = await this.stripe.customers.create({
      email: consumer.email,
    });

    await this.prisma.consumerModel.update({
      where: { id: consumer.id },
      data: { stripeCustomerId: customer.id },
    });

    return { consumer, customerId: customer.id };
  }

  // 1) Create SetupIntent for new card
  async createStripeSetupIntent(consumerId: string) {
    const { customerId } = await this.ensureStripeCustomer(consumerId);

    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: `off_session`,
      payment_method_types: [`card`],
    });

    if (!intent.client_secret) {
      throw new BadRequestException(`No client_secret from Stripe`);
    }

    return { clientSecret: intent.client_secret };
  }

  // 2) Confirm SetupIntent -> persist card in DB
  async confirmStripeSetupIntent(consumerId: string, dto: ConfirmStripeSetupIntent) {
    const { consumer } = await this.ensureStripeCustomer(consumerId);

    const setupIntent = await this.stripe.setupIntents.retrieve(dto.setupIntentId, { expand: [`payment_method`] });

    if (setupIntent.status !== `succeeded`) {
      throw new BadRequestException(`SetupIntent not succeeded. Current status: ${setupIntent.status}`);
    }

    const pm = setupIntent.payment_method;
    if (!pm || typeof pm === `string`) {
      throw new BadRequestException(`No payment_method on SetupIntent`);
    }

    if (pm.type !== `card` || !pm.card) {
      throw new BadRequestException(`Only card payment methods supported`);
    }

    const card = pm.card;
    const billing = pm.billing_details ?? {};

    const billingDetails = await this.prisma.billingDetailsModel.create({
      data: {
        email: billing[`email`] ?? consumer.email,
        name: (billing[`name`] as string | null) ?? null,
        phone: (billing[`phone`] as string | null) ?? null,
      },
    });

    const hasDefault = await this.prisma.paymentMethodModel.count({
      where: { consumerId, deletedAt: null, defaultSelected: true },
    });

    const created = await this.prisma.paymentMethodModel.create({
      data: {
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        defaultSelected: hasDefault === 0,
        brand: card.brand ?? `card`,
        last4: card.last4 ?? ``,
        serviceFee: 0,
        expMonth: card.exp_month ? String(card.exp_month).padStart(2, `0`) : null,
        expYear: card.exp_year ? String(card.exp_year) : null,
        billingDetailsId: billingDetails.id,
        consumerId,
      },
    });

    return created;
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
