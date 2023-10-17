import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { ContactService } from './contact.service'

@ApiTags(`consumer`)
@ApiTags(`contacts`)
@ApiBearerAuth()
@Controller(`consumer/contacts`)
export class ContactController {
  constructor(@Inject(ContactService) private readonly service: ContactService) {}

  @Get(`/`)
  @TransformResponse(CONSUMER.ContactListResponse)
  @ApiOkResponse({ type: CONSUMER.ContactListResponse })
  getConsumerContactsList(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.ContactListResponse> {
    return this.service.repository.findAndCountAll({ filter: { deletedAt: null, consumerId: identity.id } })
  }

  @Get(`/:contactId`)
  @TransformResponse(CONSUMER.ContactResponse)
  @ApiOkResponse({ type: CONSUMER.ContactResponse })
  getConsumerContactById(
    @Param(`contactId`) contactId: string,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.ContactResponse> {
    return this.service.repository.findOne({ deletedAt: null, id: contactId, consumerId: identity.id })
  }

  @Patch(`/:contactId`)
  @TransformResponse(CONSUMER.ContactResponse)
  @ApiOkResponse({ type: CONSUMER.ContactResponse })
  async updateConsumerContactById(
    @Param(`contactId`) contactId: string,
    @Body() body: CONSUMER.ContactUpdate,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.ContactResponse> {
    const found = await this.service.repository.findOne({ deletedAt: null, id: contactId, consumerId: identity.id })
    if (!found) throw new BadRequestException(`No contact for provided id: ${contactId}`)
    const address = { ...found.address, ...body.address }
    return this.service.repository.updateOne({ id: contactId, consumerId: identity.id }, { ...body, address })
  }

  @Post(`/`)
  @TransformResponse(CONSUMER.ContactResponse)
  @ApiOkResponse({ type: CONSUMER.ContactResponse })
  async createConsumerContact(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.ContactCreate,
  ): Promise<CONSUMER.ContactResponse> {
    const exist = await this.service.repository.findOne({ deletedAt: null, email: body.email, consumerId: identity.id })
    if (exist) throw new BadRequestException(`Contact for provided email: ${body.email} is already exist`)
    return this.service.repository.create({ ...body, consumerId: identity.id })
  }
}
