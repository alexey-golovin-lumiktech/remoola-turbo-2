import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { BillingDetailsService } from '../billing-details/billing-details.service'
import { InvoicesService } from '../invoices/invoices.service'

import { ConsumersService } from './consumer.service'

import { BillingDetailsResponse, CreateInvoice, Invoice, InvoicesListResponse, SigninResponseConsumer } from 'src/dtos/consumer'
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
  @ApiOkResponse({ type: SigninResponseConsumer })
  @TransformResponse(SigninResponseConsumer)
  async getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): Promise<SigninResponseConsumer> {
    return identity
  }

  @Get(`/billing-details`)
  @ApiOkResponse({ type: BillingDetailsResponse })
  @TransformResponse(BillingDetailsResponse)
  getBillingDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<BillingDetailsResponse> {
    return this.billingDetailsService.getBillingDetails({ consumerId: identity.id })
  }

  @Get(`/invoices`)
  @TransformResponse(InvoicesListResponse)
  @ApiOkResponse({ type: InvoicesListResponse })
  getInvoices(@ReqAuthIdentity() identity: IConsumerModel): Promise<InvoicesListResponse> {
    return this.invoicesService.getInvoices(identity)
  }

  @Post(`/invoices`)
  @TransformResponse(Invoice)
  createInvoice(@ReqAuthIdentity() identity: IConsumerModel, @Body() body: CreateInvoice): Promise<Invoice> {
    return this.invoicesService.createInvoice(identity, body)
  }
}
