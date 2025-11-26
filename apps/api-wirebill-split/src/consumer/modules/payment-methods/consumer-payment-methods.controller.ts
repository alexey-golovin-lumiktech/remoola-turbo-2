import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ConsumerModel } from '@remoola/database';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import {
  ConfirmStripeSetupIntent,
  CreateManualPaymentMethod,
  PaymentMethodsResponse,
  UpdatePaymentMethod,
  CreateStripeSetupIntentResponse,
} from './dto/payment-method.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common/decorators/identity.decorator';

@ApiTags(`Consumer: Payment Methods`)
@Controller(`consumer/payment-methods`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentMethodsController {
  constructor(private service: ConsumerPaymentMethodsService) {}

  @Get()
  async list(@Identity() identity: ConsumerModel): Promise<PaymentMethodsResponse> {
    return this.service.list(identity.id);
  }

  // Stripe SetupIntent (for card)
  @Post(`stripe/intents`)
  async createStripeSetupIntent(@Identity() identity: ConsumerModel): Promise<CreateStripeSetupIntentResponse> {
    return this.service.createStripeSetupIntent(identity.id);
  }

  @Post(`stripe/confirm`)
  async confirmStripeSetupIntent(@Identity() identity: ConsumerModel, @Body() dto: ConfirmStripeSetupIntent) {
    return this.service.confirmStripeSetupIntent(identity.id, dto);
  }

  // Manual (bank or card)
  @Post()
  async createManual(@Identity() identity: ConsumerModel, @Body() dto: CreateManualPaymentMethod) {
    return this.service.createManual(identity.id, dto);
  }

  @Patch(`:id`)
  async update(@Identity() identity: ConsumerModel, @Param(`id`) id: string, @Body() dto: UpdatePaymentMethod) {
    return this.service.update(identity.id, id, dto);
  }

  @Delete(`:id`)
  async delete(@Identity() identity: ConsumerModel, @Param(`id`) id: string) {
    return this.service.delete(identity.id, id);
  }

  @Post(`stripe/payment-method/metadata`)
  async getPaymentMethodMetadata(@Body(`paymentMethodId`) paymentMethodId: string) {
    return this.service.getPaymentMethodMetadata(paymentMethodId);
  }
}
