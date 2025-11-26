import { Controller, Post, Body, UseGuards, Param, Get, Req, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { ConsumerModel } from '@remoola/database';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { StartPaymentDto } from './dto/start-payment.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Payments`)
@Controller(`consumer/payments`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentsController {
  constructor(private readonly payments: ConsumerPaymentsService) {}

  @Get()
  async list(
    @Identity() identity: ConsumerModel,
    @Query(`page`) page = 1,
    @Query(`pageSize`) pageSize = 20,
    @Query(`status`) status?: string,
    @Query(`type`) type?: string,
    @Query(`search`) search?: string,
  ) {
    return this.payments.listPayments({
      consumerId: identity.id,
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      type,
      search,
    });
  }

  @Post(`start`)
  async startPayment(@Identity() identity: ConsumerModel, @Body() dto: StartPaymentDto) {
    return this.payments.startPayment(identity.id, dto);
  }

  @Get(`:id`)
  async getPayment(@Identity() identity: ConsumerModel, @Param(`id`) id: string) {
    return this.payments.getPaymentView(identity.id, id);
  }

  @Post(`:id/stripe-session`)
  async createStripeSession(@Identity() identity: ConsumerModel, @Param(`id`) id: string, @Req() req: express.Request) {
    return this.payments.createStripeSession(identity.id, id, req.get(`referrer`));
  }
}
