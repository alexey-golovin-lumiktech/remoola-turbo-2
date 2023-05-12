import { Controller, Get, Inject } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumersService } from './consumers.service'

import { SigninResponseConsumer } from 'src/dtos/consumer'
import { BillingDetailsResponse } from 'src/dtos/consumer/billing-details.dto'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { IConsumerModel } from 'src/models'

@ApiTags(`consumers`)
@Controller(`consumers`)
export class ConsumersController {
  constructor(
    @Inject(ConsumersService) private readonly service: ConsumersService,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
  ) {}

  @Get(`/`)
  async getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): Promise<SigninResponseConsumer> {
    return identity
  }

  @Get(`/billing-details`)
  getBillingDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<BillingDetailsResponse> {
    return this.billingDetailsService.getBillingDetails({ consumerId: identity.id })
  }
}
