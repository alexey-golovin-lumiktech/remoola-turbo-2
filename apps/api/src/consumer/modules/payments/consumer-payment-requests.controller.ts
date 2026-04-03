import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { CreatePaymentRequest } from './dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { OriginResolverService } from '../../../shared/origin-resolver.service';

@ApiTags(`Consumer: Payment Requests`)
@Controller(`consumer/payment-requests`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentRequestsController {
  constructor(
    private readonly service: ConsumerPaymentsService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private resolveConsumerAppScope(req: express.Request) {
    return this.originResolver.resolveConsumerRequestScope(req.headers.origin, req.headers.referer);
  }

  @Post()
  create(@Identity() consumer: ConsumerModel, @Body() body: CreatePaymentRequest) {
    return this.service.createPaymentRequest(consumer.id, body);
  }

  @Post(`:paymentRequestId/send`)
  send(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    return this.service.sendPaymentRequest(consumer.id, paymentRequestId, this.resolveConsumerAppScope(req));
  }
}
