import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  consumerPaymentMethodItemSchema,
  consumerPaymentMethodsResponseSchema,
  consumerSuccessResponseSchema,
  type ConsumerPaymentMethodItem,
  type ConsumerPaymentMethodsResponse,
  type ConsumerSuccessResponse,
} from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { Identity, TrackConsumerAction } from '../../../../common';
import { toConsumerWireContract } from '../../../consumer-wire-contract';
import { CreateManualPaymentMethod, UpdatePaymentMethod } from '../dto/payment-method.dto';

@ApiTags(`Consumer: Payment Methods`)
@Controller(`consumer/payment-methods`)
export class ConsumerPaymentMethodsController {
  constructor(private paymentService: ConsumerPaymentMethodsService) {}

  @Get()
  async list(@Identity() consumer: ConsumerModel): Promise<ConsumerPaymentMethodsResponse> {
    return toConsumerWireContract(consumerPaymentMethodsResponseSchema, await this.paymentService.list(consumer.id));
  }

  @TrackConsumerAction({ action: `consumer.payment_methods.attach`, resource: `payment_methods` })
  @Post()
  async createManual(
    @Identity() consumer: ConsumerModel, //
    @Body() body: CreateManualPaymentMethod,
  ): Promise<ConsumerPaymentMethodItem> {
    return toConsumerWireContract(
      consumerPaymentMethodItemSchema,
      await this.paymentService.createManual(consumer.id, body),
    );
  }

  @Patch(`:id`)
  async update(
    @Identity() consumer: ConsumerModel, //
    @Param(`id`) id: string,
    @Body() body: UpdatePaymentMethod,
  ): Promise<ConsumerPaymentMethodItem> {
    return toConsumerWireContract(
      consumerPaymentMethodItemSchema,
      await this.paymentService.update(consumer.id, id, body),
    );
  }

  @TrackConsumerAction({ action: `consumer.payment_methods.remove`, resource: `payment_methods` })
  @Delete(`:id`)
  async delete(
    @Identity() consumer: ConsumerModel, //
    @Param(`id`) id: string,
  ): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(consumerSuccessResponseSchema, await this.paymentService.delete(consumer.id, id));
  }
}
