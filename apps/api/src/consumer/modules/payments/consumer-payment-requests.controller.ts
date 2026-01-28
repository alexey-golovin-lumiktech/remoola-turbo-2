import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { CreatePaymentRequest } from './dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Payment Requests`)
@Controller(`consumer/payment-requests`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentRequestsController {
  constructor(private readonly service: ConsumerPaymentsService) {}

  @Post()
  create(@Identity() consumer: ConsumerModel, @Body() body: CreatePaymentRequest) {
    return this.service.createPaymentRequest(consumer.id, body);
  }

  @Post(`:paymentRequestId/send`)
  send(@Identity() consumer: ConsumerModel, @Param(`paymentRequestId`) paymentRequestId: string) {
    return this.service.sendPaymentRequest(consumer.id, paymentRequestId);
  }
}
