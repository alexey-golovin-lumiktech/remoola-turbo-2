import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import express from 'express';

import { CONSUMER_APP_SCOPE_HEADER, type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerInvoiceService } from './consumer-invoice.service';
import { ConsumerPaymentsService } from './consumer-payments.service';
import { PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity, TrackConsumerAction } from '../../../common';
import { OriginResolverService } from '../../../shared/origin-resolver.service';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

class ConsumerPaymentsListQuery {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @IsString()
  @IsOptional()
  role?: string;

  @Expose()
  @IsString()
  @IsOptional()
  search?: string;
}

@ApiTags(`Consumer: Payments`)
@Controller(`consumer/payments`)
@UseGuards(JwtAuthGuard)
export class ConsumerPaymentsController {
  constructor(
    private readonly service: ConsumerPaymentsService,
    private readonly invoiceService: ConsumerInvoiceService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private requireClaimedConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }
    const requestAppScope = this.originResolver.validateConsumerAppScopeHeader(
      req.headers?.[CONSUMER_APP_SCOPE_HEADER],
    );
    if (!requestAppScope || requestAppScope !== validatedAppScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    return validatedAppScope;
  }

  private resolveIdempotencyKey(req: express.Request): string | undefined {
    return req.get(`idempotency-key`)?.trim() || undefined;
  }

  @Get()
  async list(@Identity() consumer: ConsumerModel, @Query() query: ConsumerPaymentsListQuery) {
    return this.service.listPayments({
      consumerId: consumer.id,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      type: query.type,
      role: query.role,
      search: query.search,
    });
  }

  @TrackConsumerAction({ action: `consumer.payments.start`, resource: `payments` })
  @Post(`start`)
  startPayment(
    @Identity() consumer: ConsumerModel,
    @Body() body: StartPayment,
    @Req() req: express.Request,
    @Query(`appScope`) appScope?: string,
  ) {
    return this.service.startPayment(consumer.id, body, this.requireClaimedConsumerAppScope(req, appScope));
  }

  @Get(`balance`)
  @ApiOperation({ summary: `Get current settled balance (completed entries only)` })
  getBalance(@Identity() consumer: ConsumerModel) {
    return this.service.getBalancesCompleted(consumer.id);
  }

  @Get(`balance/available`)
  @ApiOperation({ summary: `Get current available balance including pending operations` })
  getAvailableBalance(@Identity() consumer: ConsumerModel) {
    return this.service.getBalancesIncludePending(consumer.id);
  }

  @Get(`history`)
  @ApiOperation({ summary: `List payment transactions` })
  history(@Identity() consumer: ConsumerModel, @Query() query: PaymentsHistoryQuery) {
    return this.service.getHistory(consumer.id, query);
  }

  @TrackConsumerAction({ action: `consumer.payments.withdraw`, resource: `payments` })
  @Post(`withdraw`)
  @ApiOperation({ summary: `Withdraw funds from consumer balance` })
  withdraw(@Identity() consumer: ConsumerModel, @Body() body: WithdrawBody, @Req() req: express.Request) {
    const idempotencyKey = this.resolveIdempotencyKey(req);
    if (!idempotencyKey) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_WITHDRAW);
    }
    return this.service.withdraw(consumer.id, body, idempotencyKey);
  }

  @TrackConsumerAction({ action: `consumer.payments.transfer`, resource: `payments` })
  @Post(`transfer`)
  @ApiOperation({ summary: `Transfer funds to another user` })
  transfer(@Identity() consumer: ConsumerModel, @Body() body: TransferBody, @Req() req: express.Request) {
    const idempotencyKey = this.resolveIdempotencyKey(req);
    if (!idempotencyKey) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER);
    }
    return this.service.transfer(consumer.id, body, idempotencyKey);
  }

  @Get(`:paymentRequestId`)
  getPayment(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    return this.service.getPaymentView(consumer.id, paymentRequestId, resolveRequestBaseUrl(req));
  }

  @Post(`:paymentRequestId/generate-invoice`)
  async generate(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Req() req: express.Request,
  ) {
    return this.invoiceService.generateInvoice(paymentRequestId, consumer.id, resolveRequestBaseUrl(req));
  }
}
