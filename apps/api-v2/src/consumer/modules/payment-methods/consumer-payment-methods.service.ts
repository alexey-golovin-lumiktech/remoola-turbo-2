import { BadRequestException, Injectable } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import { ConsumerPaymentMethodsRepository } from './consumer-payment-methods.repository';
import {
  CreateManualPaymentMethod,
  PaymentMethodItem,
  PaymentMethodsResponse,
  UpdatePaymentMethod,
} from './dto/payment-method.dto';

@Injectable()
export class ConsumerPaymentMethodsService {
  constructor(private readonly paymentMethodsRepository: ConsumerPaymentMethodsRepository) {}

  async list(consumerId: string): Promise<PaymentMethodsResponse> {
    const paymentMethods = await this.paymentMethodsRepository.listForConsumer(consumerId);

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

  async createManual(consumerId: string, body: CreateManualPaymentMethod) {
    const paymentMethod = await this.paymentMethodsRepository.createManualPaymentMethod(consumerId, body);
    await this.paymentMethodsRepository.invalidateListForConsumer(consumerId);
    return paymentMethod;
  }

  async update(consumerId: string, id: string, body: UpdatePaymentMethod) {
    const pm = await this.paymentMethodsRepository.findActiveByIdForConsumer(consumerId, id);

    if (!pm) throw new BadRequestException(errorCodes.PAYMENT_METHOD_NOT_FOUND);

    if (body.defaultSelected) {
      await this.paymentMethodsRepository.clearDefaultForType(consumerId, pm.type);
    }

    if (body.billingName || body.billingEmail || body.billingPhone) {
      if (!pm.billingDetailsId) {
        const bd = await this.paymentMethodsRepository.createBillingDetails(body);
        await this.paymentMethodsRepository.attachBillingDetails(pm.id, bd.id);
      } else {
        await this.paymentMethodsRepository.updateBillingDetails(pm.billingDetailsId, body);
      }
    }

    const paymentMethod = await this.paymentMethodsRepository.updatePaymentMethodDefault(
      pm.id,
      body.defaultSelected !== undefined ? body.defaultSelected : pm.defaultSelected,
    );
    await this.paymentMethodsRepository.invalidateListForConsumer(consumerId);
    return paymentMethod;
  }

  async delete(consumerId: string, id: string) {
    const pm = await this.paymentMethodsRepository.findActiveByIdForConsumer(consumerId, id);

    if (!pm) return { success: true };

    await this.paymentMethodsRepository.softDeleteAndPromoteFallback({
      consumerId,
      paymentMethodId: id,
      type: pm.type,
      wasDefault: pm.defaultSelected,
    });
    await this.paymentMethodsRepository.invalidateListForConsumer(consumerId);

    return { success: true };
  }
}
