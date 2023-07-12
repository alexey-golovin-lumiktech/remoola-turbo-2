import { Body, Controller, Get, Inject, Patch, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { AddressDetailsService } from '../address-details/address-details.service'
import { BillingDetailsService } from '../billing-details/billing-details.service'
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
  ) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.ConsumerResponse })
  @TransformResponse(CONSUMER.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() consumerIdentity: IConsumerModel): CONSUMER.ConsumerResponse {
    return consumerIdentity
  }

  @Get(`/google-profile-details`)
  @ApiOkResponse({ type: CONSUMER.GoogleProfileDetailsResponse })
  @TransformResponse(CONSUMER.GoogleProfileDetailsResponse)
  getConsumerGoogleProfileDetails(
    @ReqAuthIdentity() consumerIdentity: IConsumerModel,
  ): Promise<CONSUMER.GoogleProfileDetailsResponse | null> {
    return this.googleProfileDetailsService.getConsumerGoogleProfileDetails({ consumerId: consumerIdentity.id })
  }

  @Get(`/personal-details`)
  @ApiOkResponse({ type: CONSUMER.PersonalDetailsResponse })
  @TransformResponse(CONSUMER.PersonalDetailsResponse)
  getConsumerPersonalDetails(@ReqAuthIdentity() consumerIdentity: IConsumerModel): Promise<CONSUMER.PersonalDetailsResponse | null> {
    return this.personalDetailsService.getConsumerPersonalDetails({ consumerId: consumerIdentity.id })
  }

  @Get(`/address-details`)
  @ApiOkResponse({ type: CONSUMER.AddressDetailsResponse })
  @TransformResponse(CONSUMER.AddressDetailsResponse)
  getConsumerAddressDetails(@ReqAuthIdentity() consumerIdentity: IConsumerModel): Promise<CONSUMER.AddressDetailsResponse | null> {
    return this.addressDetailsService.getConsumerAddressDetails({ consumerId: consumerIdentity.id })
  }

  @Get(`/organization-details`)
  @ApiOkResponse({ type: CONSUMER.OrganizationDetailsResponse })
  @TransformResponse(CONSUMER.OrganizationDetailsResponse)
  getConsumerOrganizationDetails(
    @ReqAuthIdentity() consumerIdentity: IConsumerModel,
  ): Promise<CONSUMER.OrganizationDetailsResponse | null> {
    return this.organizationDetailsService.getConsumerOrganizationDetails({ consumerId: consumerIdentity.id })
  }

  @Get(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  getConsumerBillingDetails(@ReqAuthIdentity() consumerIdentity: IConsumerModel): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.getConsumerBillingDetails({ consumerId: consumerIdentity.id })
  }

  @Patch(`/billing-details`)
  @ApiOkResponse({ type: CONSUMER.BillingDetailsResponse })
  @TransformResponse(CONSUMER.BillingDetailsResponse)
  updateConsumerBillingDetails(
    @ReqAuthIdentity() consumerIdentity: IConsumerModel,
    @Body() body: CONSUMER.UpsertBillingDetails,
  ): Promise<CONSUMER.BillingDetailsResponse> {
    return this.billingDetailsService.upsert({ ...body, consumerId: consumerIdentity.id })
  }

  @Get(`/payment-requests`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestListResponse })
  @TransformResponse(CONSUMER.PaymentRequestListResponse)
  getConsumerPaymentRequests(
    @ReqAuthIdentity() consumerIdentity: IConsumerModel,
    @Query() query: ListQuery<IPaymentRequestModel>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    return this.paymentService.getConsumerPaymentRequests(consumerIdentity.id, query)
  }
}
