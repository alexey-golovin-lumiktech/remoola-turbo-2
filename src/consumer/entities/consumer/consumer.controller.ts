import { Body, Controller, Get, Inject, Patch, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

import { CONSUMER } from '../../../dtos'
import { PaymentRequestListResponse } from '../../../dtos/consumer'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { BillingDetailsService } from '../billing-details/billing-details.service'
import { PaymentRequestService } from '../payment-request/payment-request.service'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@Controller(`consumer`)
export class ConsumerController {
  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
    @Inject(PaymentRequestService) private readonly paymentService: PaymentRequestService,
  ) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.ConsumerResponse })
  @TransformResponse(CONSUMER.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): CONSUMER.ConsumerResponse {
    return identity
  }

  @Get(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  getBillingDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.getConsumerBillingDetails({ consumerId: identity.id })
  }

  @Patch(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  patchBillingDetails(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.UpsertBillingDetails,
  ): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.upsert({ ...body, consumerId: identity.id })
  }

  @Get(`/payment-requests`)
  @ApiOkResponse({ type: PaymentRequestListResponse })
  @TransformResponse(PaymentRequestListResponse)
  listPaymentRequests(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query() query: ListQuery<IPaymentRequestModel>,
  ): Promise<PaymentRequestListResponse> {
    return this.paymentService.listPaymentRequests(identity.id, query)
  }
}
