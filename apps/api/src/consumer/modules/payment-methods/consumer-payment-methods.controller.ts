import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import {
  ConfirmStripeSetupIntent,
  CreateManualPaymentMethod,
  PaymentMethodsResponse,
  UpdatePaymentMethod,
  CreateStripeSetupIntentResponse,
} from './dto/payment-method.dto';
import { ConsumerStripeService } from './stripe.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Payment Methods`)
@Controller(`consumer/payment-methods`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentMethodsController {
  constructor(
    private paymentService: ConsumerPaymentMethodsService,
    private readonly stripeService: ConsumerStripeService,
  ) {}

  @Get()
  async list(@Identity() consumer: ConsumerModel): Promise<PaymentMethodsResponse> {
    return this.paymentService.list(consumer.id);
  }

  @Post(`stripe/intents`)
  async createStripeSetupIntent(@Identity() consumer: ConsumerModel): Promise<CreateStripeSetupIntentResponse> {
    return this.stripeService.createStripeSetupIntent(consumer.id);
  }

  @Post(`stripe/confirm`)
  async confirmStripeSetupIntent(@Identity() consumer: ConsumerModel, @Body() body: ConfirmStripeSetupIntent) {
    return this.stripeService.confirmStripeSetupIntent(consumer.id, body);
  }

  @Post()
  async createManual(@Identity() consumer: ConsumerModel, @Body() body: CreateManualPaymentMethod) {
    return this.paymentService.createManual(consumer.id, body);
  }

  @Patch(`:id`)
  async update(@Identity() consumer: ConsumerModel, @Param(`id`) id: string, @Body() body: UpdatePaymentMethod) {
    return this.paymentService.update(consumer.id, id, body);
  }

  @Delete(`:id`)
  async delete(@Identity() consumer: ConsumerModel, @Param(`id`) id: string) {
    return this.paymentService.delete(consumer.id, id);
  }

  @Post(`stripe/payment-method/metadata`)
  async getPaymentMethodMetadata(@Body(`paymentMethodId`) paymentMethodId: string) {
    return this.stripeService.getPaymentMethodMetadata(paymentMethodId);
  }
}
