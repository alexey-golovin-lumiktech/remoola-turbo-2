import { BadRequestException, Controller, Post, Body, UseGuards, Param, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerInvoiceService } from './consumer-invoice.service';
import { ConsumerPaymentsService } from './consumer-payments.service';
import { PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Payments`)
@Controller(`consumer/payments`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentsController {
  constructor(
    private readonly service: ConsumerPaymentsService,
    private readonly invoiceService: ConsumerInvoiceService,
  ) {}

  @Get()
  async list(
    @Identity() consumer: ConsumerModel,
    @Query(`page`) page = 1,
    @Query(`pageSize`) pageSize = 20,
    @Query(`status`) status?: string,
    @Query(`type`) type?: string,
    @Query(`search`) search?: string,
  ) {
    return this.service.listPayments({
      consumerId: consumer.id,
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      type,
      search,
    });
  }

  @Post(`start`)
  startPayment(@Identity() consumer: ConsumerModel, @Body() body: StartPayment) {
    return this.service.startPayment(consumer.id, body);
  }

  @Get(`balance`)
  @ApiOperation({ summary: `Get current available balance` })
  getBalance(@Identity() consumer: ConsumerModel) {
    return this.service.getBalancesCompleted(consumer.id);
  }

  @Get(`history`)
  @ApiOperation({ summary: `List payment transactions` })
  history(@Identity() consumer: ConsumerModel, @Query() query: PaymentsHistoryQuery) {
    return this.service.getHistory(consumer.id, query);
  }

  @Post(`withdraw`)
  @ApiOperation({ summary: `Withdraw funds from consumer balance` })
  withdraw(@Identity() consumer: ConsumerModel, @Body() body: WithdrawBody, @Req() req: express.Request) {
    const idempotencyKey = req.get(`idempotency-key`)?.trim();
    if (!idempotencyKey) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_WITHDRAW);
    }
    return this.service.withdraw(consumer.id, body, idempotencyKey);
  }

  @Post(`transfer`)
  @ApiOperation({ summary: `Transfer funds to another user` })
  transfer(@Identity() consumer: ConsumerModel, @Body() body: TransferBody, @Req() req: express.Request) {
    const idempotencyKey = req.get(`idempotency-key`)?.trim();
    if (!idempotencyKey) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER);
    }
    return this.service.transfer(consumer.id, body, idempotencyKey);
  }

  @Get(`:paymentRequestId`)
  getPayment(@Identity() consumer: ConsumerModel, @Param(`paymentRequestId`) paymentRequestId: string) {
    return this.service.getPaymentView(consumer.id, paymentRequestId);
  }

  @Post(`:paymentRequestId/generate-invoice`)
  async generate(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    return this.invoiceService.generateInvoice(paymentRequestId, consumer.id, req.get(`host`));
  }
}
