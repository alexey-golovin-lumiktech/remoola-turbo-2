import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import express from 'express';

import {
  CONSUMER_APP_SCOPE_HEADER,
  consumerBalanceResponseSchema,
  consumerInvoiceGenerationResponseSchema,
  consumerPaymentHistoryResponseSchema,
  consumerPaymentsResponseSchema,
  consumerPaymentViewResponseSchema,
  consumerStartPaymentResponseSchema,
  consumerTransferResponseSchema,
  type ConsumerAppScope,
  type ConsumerBalanceResponse,
  type ConsumerInvoiceGenerationResponse,
  type ConsumerPaymentHistoryResponse,
  type ConsumerPaymentsResponse,
  type ConsumerPaymentViewResponse,
  type ConsumerStartPaymentResponse,
  type ConsumerTransferResponse,
} from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerInvoiceService } from './consumer-invoice.service';
import { ConsumerPaymentsService } from './consumer-payments.service';
import { ConsumerPaymentsListWithPagingQuery, PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';
import { Identity, TrackConsumerAction } from '../../../common';
import { OriginResolverService } from '../../../shared/origin-resolver.service';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: Payments`)
@Controller(`consumer/payments`)
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
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiQuery({ name: `status`, required: false })
  @ApiQuery({ name: `type`, required: false })
  @ApiQuery({ name: `role`, required: false })
  @ApiQuery({ name: `search`, required: false })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async list(
    @Identity() consumer: ConsumerModel,
    @Query() query: ConsumerPaymentsListWithPagingQuery,
  ): Promise<ConsumerPaymentsResponse> {
    return toConsumerWireContract(
      consumerPaymentsResponseSchema,
      await this.service.listPayments({
        consumerId: consumer.id,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        status: query.status,
        type: query.type,
        role: query.role,
        search: query.search,
      }),
    );
  }

  @TrackConsumerAction({ action: `consumer.payments.start`, resource: `payments` })
  @Post(`start`)
  startPayment(
    @Identity() consumer: ConsumerModel,
    @Body() body: StartPayment,
    @Req() req: express.Request,
    @Query(`appScope`) appScope?: string,
  ): Promise<ConsumerStartPaymentResponse> {
    return this.service
      .startPayment(consumer.id, body, this.requireClaimedConsumerAppScope(req, appScope))
      .then((result) => toConsumerWireContract(consumerStartPaymentResponseSchema, result));
  }

  @Get(`balance`)
  @ApiOperation({ summary: `Get current settled balance (completed entries only)` })
  async getBalance(@Identity() consumer: ConsumerModel): Promise<ConsumerBalanceResponse> {
    return toConsumerWireContract(consumerBalanceResponseSchema, await this.service.getBalancesCompleted(consumer.id));
  }

  @Get(`balance/available`)
  @ApiOperation({ summary: `Get current available balance including pending operations` })
  async getAvailableBalance(@Identity() consumer: ConsumerModel): Promise<ConsumerBalanceResponse> {
    return toConsumerWireContract(
      consumerBalanceResponseSchema,
      await this.service.getBalancesIncludePending(consumer.id),
    );
  }

  @Get(`history`)
  @ApiOperation({ summary: `List payment transactions` })
  async history(
    @Identity() consumer: ConsumerModel,
    @Query() query: PaymentsHistoryQuery,
  ): Promise<ConsumerPaymentHistoryResponse> {
    return toConsumerWireContract(
      consumerPaymentHistoryResponseSchema,
      await this.service.getHistory(consumer.id, query),
    );
  }

  @TrackConsumerAction({ action: `consumer.payments.withdraw`, resource: `payments` })
  @Post(`withdraw`)
  @ApiOperation({ summary: `Withdraw funds from consumer balance` })
  async withdraw(
    @Identity() consumer: ConsumerModel,
    @Body() body: WithdrawBody,
    @Req() req: express.Request,
  ): Promise<ConsumerTransferResponse> {
    const idempotencyKey = this.resolveIdempotencyKey(req);
    if (!idempotencyKey) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_WITHDRAW);
    }
    return toConsumerWireContract(
      consumerTransferResponseSchema,
      await this.service.withdraw(consumer.id, body, idempotencyKey),
    );
  }

  @TrackConsumerAction({ action: `consumer.payments.transfer`, resource: `payments` })
  @Post(`transfer`)
  @ApiOperation({ summary: `Transfer funds to another user` })
  async transfer(
    @Identity() consumer: ConsumerModel,
    @Body() body: TransferBody,
    @Req() req: express.Request,
  ): Promise<ConsumerTransferResponse> {
    const idempotencyKey = this.resolveIdempotencyKey(req);
    if (!idempotencyKey) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER);
    }
    return toConsumerWireContract(
      consumerTransferResponseSchema,
      await this.service.transfer(consumer.id, body, idempotencyKey),
    );
  }

  @Get(`:paymentRequestId`)
  @ApiParam({ name: `paymentRequestId`, format: `uuid`, description: `Payment request id` })
  @ApiBadRequestResponse({ description: `Invalid payment request id.` })
  getPayment(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`, ParseUUIDPipe) paymentRequestId: string,
    @Req() req: express.Request,
  ): Promise<ConsumerPaymentViewResponse> {
    return this.service
      .getPaymentView(consumer.id, paymentRequestId, resolveRequestBaseUrl(req))
      .then((result) => toConsumerWireContract(consumerPaymentViewResponseSchema, result));
  }

  @Post(`:paymentRequestId/generate-invoice`)
  @ApiParam({ name: `paymentRequestId`, format: `uuid`, description: `Payment request id` })
  @ApiBadRequestResponse({ description: `Invalid payment request id.` })
  async generate(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`, ParseUUIDPipe) paymentRequestId: string,
    @Req() req: express.Request,
  ): Promise<ConsumerInvoiceGenerationResponse> {
    return toConsumerWireContract(
      consumerInvoiceGenerationResponseSchema,
      await this.invoiceService.generateInvoice(paymentRequestId, consumer.id, resolveRequestBaseUrl(req)),
    );
  }
}
