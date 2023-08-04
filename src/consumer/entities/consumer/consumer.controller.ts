import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ListResponse } from 'src/dtos/common'
import { CreditCardCreate, CreditCardResponse, CreditCardUpdate } from 'src/dtos/consumer'

import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import { ReqQuery, TimelineFilter } from '@wirebill/shared-common/types'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { ParseJsonPipe, ReqQueryTransformPipe } from '../../pipes'
import { AddressDetailsService } from '../address-details/address-details.service'
import { BillingDetailsService } from '../billing-details/billing-details.service'
import { CreditCardService } from '../credit-card/credit-card.service'
import { GoogleProfileDetailsService } from '../google-profile-details/google-profile-details.service'
import { OrganizationDetailsService } from '../organization-details/organization-details.service'
import { PaymentRequestService } from '../payment-request/payment-request.service'
import { PersonalDetailsService } from '../personal-details/personal-details.service'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@Controller(`consumer`)
export class ConsumerController {
  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
    @Inject(PaymentRequestService) private readonly paymentService: PaymentRequestService,
    @Inject(GoogleProfileDetailsService) private readonly googleProfileDetailsService: GoogleProfileDetailsService,
    @Inject(PersonalDetailsService) private readonly personalDetailsService: PersonalDetailsService,
    @Inject(AddressDetailsService) private readonly addressDetailsService: AddressDetailsService,
    @Inject(OrganizationDetailsService) private readonly organizationDetailsService: OrganizationDetailsService,
    @Inject(CreditCardService) private readonly creditCardService: CreditCardService,
  ) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.ConsumerResponse })
  @TransformResponse(CONSUMER.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): CONSUMER.ConsumerResponse {
    return identity
  }

  @Get(`/google-profile-details`)
  @ApiOkResponse({ type: CONSUMER.GoogleProfileDetailsResponse })
  @TransformResponse(CONSUMER.GoogleProfileDetailsResponse)
  getConsumerGoogleProfileDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.GoogleProfileDetailsResponse | null> {
    if (identity.googleProfileDetailsId == null) return null
    return this.googleProfileDetailsService.repository.findById(identity.googleProfileDetailsId)
  }

  @Get(`/personal-details`)
  @ApiOkResponse({ type: CONSUMER.PersonalDetailsResponse })
  @TransformResponse(CONSUMER.PersonalDetailsResponse)
  getConsumerPersonalDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.PersonalDetailsResponse | null> {
    if (identity.personalDetailsId == null) return null
    return this.personalDetailsService.repository.findById(identity.personalDetailsId)
  }

  @Get(`/address-details`)
  @ApiOkResponse({ type: CONSUMER.AddressDetailsResponse })
  @TransformResponse(CONSUMER.AddressDetailsResponse)
  getConsumerAddressDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.AddressDetailsResponse | null> {
    if (identity.addressDetailsId == null) return null
    return this.addressDetailsService.repository.findById(identity.addressDetailsId)
  }

  @Get(`/organization-details`)
  @ApiOkResponse({ type: CONSUMER.OrganizationDetailsResponse })
  @TransformResponse(CONSUMER.OrganizationDetailsResponse)
  getConsumerOrganizationDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.OrganizationDetailsResponse | null> {
    if (identity.organizationDetailsId == null) return null
    return this.organizationDetailsService.repository.findById(identity.organizationDetailsId)
  }

  @Get(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  getConsumerBillingDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.BillingDetailsResponse> {
    if (identity.billingDetailsId == null) return null
    return this.billingDetailsService.repository.findById(identity.billingDetailsId)
  }

  @Patch(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  updateConsumerBillingDetails(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.BillingDetailsUpdate,
  ): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.upsert({ ...body, consumerId: identity.id })
  }

  @Get(`/payment-requests`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestListResponse })
  @TransformResponse(CONSUMER.PaymentRequestListResponse)
  getConsumerPaymentRequestsList(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentRequestModel>,
    @Query(`timelineFilter`, ParseJsonPipe) timelineFilter: Unassignable<TimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    return this.paymentService.getConsumerPaymentRequestsList(identity.id, query, timelineFilter)
  }

  @Get(`/credit-cards`)
  getConsumerCreditCardsList(@ReqAuthIdentity() identity: IConsumerModel): Promise<ListResponse<CreditCardResponse>> {
    return this.creditCardService.repository.findAndCountAll({ filter: { consumerId: identity.id } })
  }

  @Get(`/credit-cards/:cardId`)
  getConsumerCreditCardById(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Param(`cardId`) cardId: string,
  ): Promise<CreditCardResponse | null> {
    return this.creditCardService.repository.findById(cardId)
  }

  @Patch(`/credit-cards/:cardId`)
  updateConsumerCreditCardById(
    @Param(`cardId`) cardId: string,
    @Body() body: CreditCardUpdate,
    @ReqAuthIdentity() identity: IConsumerModel, //
  ) {
    return this.creditCardService.repository.updateById(cardId, { ...body, consumerId: identity.id })
  }

  @Post(`/credit-cards`)
  createConsumerCreditCard(@ReqAuthIdentity() identity: IConsumerModel, @Body() body: CreditCardCreate): Promise<CreditCardResponse> {
    return this.creditCardService.repository.create({ ...body, consumerId: identity.id })
  }
}
