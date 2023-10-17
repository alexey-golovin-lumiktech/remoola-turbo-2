import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { AddressDetailsService } from '../address-details/address-details.service'
import { ContactService } from '../contact/contact.service'
import { CreditCardService } from '../credit-card/credit-card.service'
import { GoogleProfileDetailsService } from '../google-profile-details/google-profile-details.service'
import { OrganizationDetailsService } from '../organization-details/organization-details.service'
import { PersonalDetailsService } from '../personal-details/personal-details.service'
import { TransactionService } from '../transaction/transaction.service'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@ApiBearerAuth()
@Controller(`consumer`)
export class ConsumerController {
  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(GoogleProfileDetailsService) private readonly googleProfileDetailsService: GoogleProfileDetailsService,
    @Inject(PersonalDetailsService) private readonly personalDetailsService: PersonalDetailsService,
    @Inject(AddressDetailsService) private readonly addressDetailsService: AddressDetailsService,
    @Inject(OrganizationDetailsService) private readonly organizationDetailsService: OrganizationDetailsService,
    @Inject(CreditCardService) private readonly creditCardService: CreditCardService,
    @Inject(ContactService) private readonly contactService: ContactService,
    @Inject(TransactionService) private readonly transactionService: TransactionService,
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
    return this.googleProfileDetailsService.repository.findOne({ deletedAt: null, id: identity.googleProfileDetailsId })
  }

  @Get(`/personal-details`)
  @ApiOkResponse({ type: CONSUMER.PersonalDetailsResponse })
  @TransformResponse(CONSUMER.PersonalDetailsResponse)
  getConsumerPersonalDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.PersonalDetailsResponse | null> {
    return this.personalDetailsService.repository.findOne({ deletedAt: null, id: identity.personalDetailsId })
  }

  @Get(`/address-details`)
  @ApiOkResponse({ type: CONSUMER.AddressDetailsResponse })
  @TransformResponse(CONSUMER.AddressDetailsResponse)
  getConsumerAddressDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.AddressDetailsResponse | null> {
    return this.addressDetailsService.repository.findOne({ deletedAt: null, id: identity.addressDetailsId })
  }

  @Get(`/organization-details`)
  @ApiOkResponse({ type: CONSUMER.OrganizationDetailsResponse })
  @TransformResponse(CONSUMER.OrganizationDetailsResponse)
  getConsumerOrganizationDetails(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.OrganizationDetailsResponse | null> {
    return this.organizationDetailsService.repository.findOne({ deletedAt: null, id: identity.organizationDetailsId })
  }

  @Get(`/credit-cards`)
  @TransformResponse(CONSUMER.CreditCardsListResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardsListResponse })
  getConsumerCreditCardsList(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.CreditCardsListResponse> {
    return this.creditCardService.repository.findAndCountAll({ filter: { deletedAt: null, consumerId: identity.id } })
  }

  @Get(`/credit-cards/:cardId`)
  @TransformResponse(CONSUMER.CreditCardResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardResponse })
  getConsumerCreditCardById(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Param(`cardId`) cardId: string,
  ): Promise<CONSUMER.CreditCardResponse | null> {
    return this.creditCardService.repository.findOne({ deletedAt: null, id: cardId, consumerId: identity.id })
  }

  @Patch(`/credit-cards/:cardId`)
  @TransformResponse(CONSUMER.CreditCardResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardResponse })
  updateConsumerCreditCardById(
    @Param(`cardId`) cardId: string,
    @Body() body: CONSUMER.CreditCardUpdate,
    @ReqAuthIdentity() identity: IConsumerModel, //
  ): Promise<CONSUMER.CreditCardResponse | null> {
    return this.creditCardService.repository.updateOne(
      { deletedAt: null, id: cardId, consumerId: identity.id },
      { ...body, consumerId: identity.id },
    )
  }

  @Post(`/credit-cards`)
  @TransformResponse(CONSUMER.CreditCardResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardResponse })
  createConsumerCreditCard(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.CreditCardCreate,
  ): Promise<CONSUMER.CreditCardResponse> {
    return this.creditCardService.repository.create({ ...body, consumerId: identity.id })
  }

  @Get(`/contacts`)
  @TransformResponse(CONSUMER.ContactListResponse)
  @ApiOkResponse({ type: CONSUMER.ContactListResponse })
  getConsumerContactsList(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.ContactListResponse> {
    return this.contactService.repository.findAndCountAll({ filter: { deletedAt: null, consumerId: identity.id } })
  }

  @Get(`/contacts/:contactId`)
  @TransformResponse(CONSUMER.ContactResponse)
  @ApiOkResponse({ type: CONSUMER.ContactResponse })
  getConsumerContactById(
    @Param(`contactId`) contactId: string,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.ContactResponse> {
    return this.contactService.repository.findOne({ deletedAt: null, id: contactId, consumerId: identity.id })
  }

  @Patch(`/contacts/:contactId`)
  @TransformResponse(CONSUMER.ContactResponse)
  @ApiOkResponse({ type: CONSUMER.ContactResponse })
  async updateConsumerContactById(
    @Param(`contactId`) contactId: string,
    @Body() body: CONSUMER.ContactUpdate,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.ContactResponse> {
    const found = await this.contactService.repository.findOne({ deletedAt: null, id: contactId, consumerId: identity.id })
    if (!found) throw new BadRequestException(`No contact for provided id: ${contactId}`)
    const address = { ...found.address, ...body.address }
    return this.contactService.repository.updateOne({ id: contactId, consumerId: identity.id }, { ...body, address })
  }

  @Post(`/contacts`)
  @TransformResponse(CONSUMER.ContactResponse)
  @ApiOkResponse({ type: CONSUMER.ContactResponse })
  async createConsumerContact(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.ContactCreate,
  ): Promise<CONSUMER.ContactResponse> {
    const exist = await this.contactService.repository.findOne({ deletedAt: null, email: body.email, consumerId: identity.id })
    if (exist) throw new BadRequestException(`Contact for provided email: ${body.email} is already exist`)
    return this.contactService.repository.create({ ...body, consumerId: identity.id })
  }

  @Get(`/transactions`)
  @TransformResponse(CONSUMER.TransactionListResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionListResponse })
  getConsumerTransactionList(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.TransactionListResponse> {
    return this.transactionService.repository.findAndCountAll({ filter: { deletedAt: null, createdBy: identity.email } })
  }

  @Get(`/transactions/:transactionId/:code`)
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  getConsumerTransactionById(
    @Param(`transactionId`) transactionId: string,
    @Param(`code`) code: string,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.TransactionResponse> {
    return this.transactionService.repository.findOne({ deletedAt: null, id: transactionId, code, createdBy: identity.email })
  }

  @Patch(`/transactions/:transactionId/:code`)
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  async updateConsumerTransactionById(
    @Param(`transactionId`) transactionId: string,
    @Param(`code`) code: string,
    @Body() body: CONSUMER.TransactionUpdate,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.TransactionResponse> {
    const now = new Date()
    return this.transactionService.repository.updateOne(
      { id: transactionId, code, createdBy: identity.email },
      {
        ...body,
        updatedAt: now,
        updatedBy: identity.email,
      },
    )
  }

  @Post(`/transactions`)
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  async createConsumerTransaction(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.TransactionCreate,
  ): Promise<CONSUMER.TransactionResponse> {
    const now = new Date()
    return this.transactionService.repository.create({
      ...body,
      createdAt: now,
      createdBy: identity.email,
      updatedAt: now,
      updatedBy: identity.email,
    })
  }
}
