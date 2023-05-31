import { Body, Controller, Get, Inject, InternalServerErrorException, Patch, Post, Query, Redirect } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { isEmpty, isNil } from 'lodash'

import { ApiCountRowsResponse, PublicEndpoint } from '../../../decorators'
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
  getInvoicesList(@ReqAuthIdentity() identity: IConsumerModel, @Query() query?: CONSUMER.QueryInvoices): Promise<CONSUMER.InvoicesList> {
    return this.invoicesService.getInvoicesList(identity, query)
  }

  @Post(`/invoices`)
  @TransformResponse(CONSUMER.Invoice)
  createInvoice(@ReqAuthIdentity() identity: IConsumerModel, @Body() body: CONSUMER.CreateInvoice): Promise<CONSUMER.Invoice> {
    return this.invoicesService.createInvoiceLocalFirst(identity, body)
  }

  @PublicEndpoint()
  @Get(`/payment-choices`)
  @Redirect(process.env.FRONTEND_BASE_URL, 302)
  async redirectToPaymentChoices(@Query(`invoiceId`) invoiceId: string, @Query(`refererEmail`) refererEmail: string) {
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL
    const isFrontendBaseUrlExist = !isEmpty(frontendBaseUrl) && !isNil(frontendBaseUrl)
    if (!isFrontendBaseUrlExist) throw new InternalServerErrorException(`lost frontendBaseURL`)

    const [invoice] = await this.invoicesService.repository.find({ filter: { id: invoiceId } })
    const [referer] = await this.service.repository.find({ filter: { email: refererEmail } })
    const isInvoiceExist = !isNil(invoice) && !isEmpty(invoice)
    const isRefererExist = !isNil(referer) && !isEmpty(referer)

    if (isInvoiceExist && isRefererExist) {
      const url = new URL(`payment-choices`, frontendBaseUrl)
      url.searchParams.append(`invoiceId`, invoiceId)
      url.searchParams.append(`refererEmail`, refererEmail)
      return { url: url.href }
    }

    const url = new URL(`error-page`, frontendBaseUrl)
    url.searchParams.append(`message`, `Invalid link. Canceled!`)
    return { url: url.href }
  }
}
