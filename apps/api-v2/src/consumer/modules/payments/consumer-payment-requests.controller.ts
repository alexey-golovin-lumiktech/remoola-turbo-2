import { BadRequestException, Body, Controller, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import {
  CONSUMER_APP_SCOPE_HEADER,
  consumerCreatePaymentRequestResponseSchema,
  type ConsumerAppScope,
  type ConsumerCreatePaymentRequestResponse,
} from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { CreatePaymentRequest } from './dto';
import { Identity } from '../../../common';
import { OriginResolverService } from '../../../shared/origin-resolver.service';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: Payment Requests`)
@Controller(`consumer/payment-requests`)
export class ConsumerPaymentRequestsController {
  constructor(
    private readonly service: ConsumerPaymentsService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private resolveConsumerAppScope(req: express.Request, appScope?: string | null): ConsumerAppScope {
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

  @Post()
  async create(
    @Identity() consumer: ConsumerModel,
    @Body() body: CreatePaymentRequest,
  ): Promise<ConsumerCreatePaymentRequestResponse> {
    return toConsumerWireContract(
      consumerCreatePaymentRequestResponseSchema,
      await this.service.createPaymentRequest(consumer.id, body),
    );
  }

  @Post(`:paymentRequestId/send`)
  send(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Query(`appScope`) appScope: string | undefined,
    @Req() req: express.Request,
  ): Promise<ConsumerCreatePaymentRequestResponse> {
    return this.service
      .sendPaymentRequest(consumer.id, paymentRequestId, this.resolveConsumerAppScope(req, appScope))
      .then((result) => toConsumerWireContract(consumerCreatePaymentRequestResponseSchema, result));
  }
}
