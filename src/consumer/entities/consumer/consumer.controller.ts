import { Body, Controller, Get, Inject, Patch, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { CONSUMER } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { IConsumerModel, IPaymentRequestModel } from '../../../models'
import { ListQuery } from '../../../shared-types'
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
    return this.billingDetailsService.getBillingDetails({ consumerId: identity.id })
  }

  @Patch(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  patchBillingDetails(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.UpsertBillingDetails,
  ): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.upsertBillingDetails({ ...body, consumerId: identity.id })
  }

  @Get(`/payment-request`)
  listPaymentRequests(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query() query: ListQuery<IPaymentRequestModel>,
  ): Promise<ListResponse<CONSUMER.PaymentResponse>> {
    return this.paymentService.listPaymentRequests(identity.id, query)
  }
}
