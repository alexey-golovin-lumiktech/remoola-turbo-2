import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { ContactService } from '../contact/contact.service'
import { TransactionService } from '../transaction/transaction.service'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@ApiBearerAuth()
@Controller(`consumer`)
export class ConsumerController {
  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(ContactService) private readonly contactService: ContactService,
    @Inject(TransactionService) private readonly transactionService: TransactionService,
  ) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.ConsumerResponse })
  @TransformResponse(CONSUMER.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): CONSUMER.ConsumerResponse {
    return identity
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
