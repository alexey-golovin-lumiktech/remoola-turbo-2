import { Body, Controller, Get, Inject, Patch, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { ApiCountRowsResponse } from '../../../decorators'
import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors/response.interceptor'
import { IConsumerModel } from '../../../models'
import { BillingDetailsService } from '../billing-details/billing-details.service'
import { InvoicesService } from '../invoices/invoices.service'

import { ConsumersService } from './consumer.service'

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

  @Patch(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  patchBillingDetails(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.UpsertBillingDetails,
  ): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.upsertBillingDetails({ ...body, consumerId: identity.id })
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
