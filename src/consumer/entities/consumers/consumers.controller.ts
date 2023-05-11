import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumersService } from './consumers.service'

@ApiTags(`consumers`)
@Controller(`consumers`)
export class ConsumersController {
  constructor(
    @Inject(ConsumersService) private readonly service: ConsumersService,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService
  ) {}

  @Get(`/:consumerId`)
  async getConsumerById(@Param(`consumerId`) consumerId: string): Promise<any> {
    const consumer = await this.service.getConsumerById(consumerId)
    if (!consumer) throw new NotFoundException(`requested consumer does not exists`)
    return consumer
  }

  @Get(`/:consumerId/billing-details`)
  getBillingDetails(@Param(`consumerId`) consumerId: string): Promise<any> {
    return this.billingDetailsService.getBillingDetails({ consumerId })
  }
}
