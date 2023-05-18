import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { BillingDetailsService } from '../billing-details/billing-details.service'
import { InvoicesService } from '../invoices/invoices.service'

import { ConsumersService } from './consumer.service'

import { ApiCountRowsResponse } from 'src/decorators'
import { CONSUMER } from 'src/dtos'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors/response.interceptor'
import { IConsumerModel } from 'src/models'

@ApiTags(`consumer`)
@Controller(`consumer`)
export class ConsumersController {
  constructor(
    @Inject(ConsumersService) private readonly service: ConsumersService,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
    @Inject(InvoicesService) private readonly invoicesService: InvoicesService,
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

  @Get(`/invoices`)
  @ApiCountRowsResponse(CONSUMER.QueryInvoices)
  @TransformResponse(CONSUMER.InvoicesList)
  getInvoices(@ReqAuthIdentity() identity: IConsumerModel, @Query() query?: CONSUMER.QueryInvoices): Promise<CONSUMER.InvoicesList> {
    return this.invoicesService.getInvoices(identity, query)
  }

  @Post(`/invoices`)
  @TransformResponse(CONSUMER.Invoice)
  createInvoice(@ReqAuthIdentity() identity: IConsumerModel, @Body() body: CONSUMER.CreateInvoice): Promise<CONSUMER.Invoice> {
    return this.invoicesService.createInvoice(identity, body)
  }
}
