import { Body, Controller, Get, Inject, Patch } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors/response.interceptor'
import { IConsumerModel } from '../../../models'
import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@Controller(`consumer`)
export class ConsumerController {
  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
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
}
