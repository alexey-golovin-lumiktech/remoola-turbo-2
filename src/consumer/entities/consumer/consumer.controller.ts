import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { BillingDetailsService } from '../billing-details/billing-details.service'
import { InvoicesService } from '../invoices/invoices.service'

import { ConsumersService } from './consumer.service'

import { ApiCountRowsResponse } from 'src/decorators'
import { CommonDTOS, ConsumerDTOS } from 'src/dtos'
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
  @ApiOkResponse({ type: ConsumerDTOS.ConsumerResponse })
  @TransformResponse(ConsumerDTOS.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): ConsumerDTOS.ConsumerResponse {
    return identity
  }

  @Get(`/billing-details`)
  @ApiOkResponse({ type: ConsumerDTOS.BillingDetailsResponse })
  @TransformResponse(ConsumerDTOS.BillingDetailsResponse)
  getBillingDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<ConsumerDTOS.BillingDetailsResponse> {
    return this.billingDetailsService.getBillingDetails({ consumerId: identity.id })
  }

  @Get(`/invoices`)
  // @TransformResponse(CommonDTOS.ListResponseDTO<ConsumerDTOS.QueryInvoices>)
  @ApiCountRowsResponse(ConsumerDTOS.QueryInvoices)
  getInvoices(
    @ReqAuthIdentity() identity: IConsumerModel, //
    @Query() query?: ConsumerDTOS.QueryInvoices,
  ): Promise<CommonDTOS.ListResponseDTO<ConsumerDTOS.InvoiceResponse>> {
    return this.invoicesService.getInvoices(identity, query)
  }

  @Post(`/invoices`)
  @TransformResponse(ConsumerDTOS.Invoice)
  createInvoice(
    @ReqAuthIdentity() identity: IConsumerModel, //
    @Body() body: ConsumerDTOS.CreateInvoice,
  ): Promise<ConsumerDTOS.Invoice> {
    return this.invoicesService.createInvoice(identity, body)
  }
}
