import { Controller, Post, Body, UseGuards, Param, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { PaymentsHistoryQueryDto, TransferDto, WithdrawDto } from './dto';
import { StartPayment } from './dto/start-payment.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Payments`)
@Controller(`consumer/payments`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentsController {
  constructor(private readonly service: ConsumerPaymentsService) {}

  @Get()
  async list(
    @Identity() identity: ConsumerModel,
    @Query(`page`) page = 1,
    @Query(`pageSize`) pageSize = 20,
    @Query(`status`) status?: string,
    @Query(`type`) type?: string,
    @Query(`search`) search?: string,
  ) {
    return this.service.listPayments({
      consumerId: identity.id,
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      type,
      search,
    });
  }

  @Post(`start`)
  startPayment(@Identity() identity: ConsumerModel, @Body() body: StartPayment) {
    return this.service.startPayment(identity.id, body);
  }

  @Get(`balance`)
  @ApiOperation({ summary: `Get current available balance` })
  getBalance(@Identity() consumer: ConsumerModel) {
    return this.service.getBalances(consumer.id);
  }

  @Get(`history`)
  @ApiOperation({ summary: `List payment transactions` })
  history(@Identity() consumer: ConsumerModel, @Query() query: PaymentsHistoryQueryDto) {
    return this.service.getHistory(consumer.id, query);
  }

  @Post(`withdraw`)
  @ApiOperation({ summary: `Withdraw funds from consumer balance` })
  withdraw(@Identity() consumer: ConsumerModel, @Body() body: WithdrawDto) {
    return this.service.withdraw(consumer.id, body);
  }

  @Post(`transfer`)
  @ApiOperation({ summary: `Transfer funds to another user` })
  transfer(@Identity() consumer: ConsumerModel, @Body() body: TransferDto) {
    return this.service.transfer(consumer.id, body);
  }

  @Get(`:id`)
  getPayment(@Identity() identity: ConsumerModel, @Param(`id`) id: string) {
    return this.service.getPaymentView(identity.id, id);
  }
}
