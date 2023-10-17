import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CONSUMER } from 'src/dtos'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CreditCardService } from './credit-card.service'

@ApiTags(`consumer`)
@ApiTags(`credit-cards`)
@ApiBearerAuth()
@Controller(`consumer/credit-cards`)
export class CreditCardController {
  constructor(@Inject(CreditCardService) private readonly service: CreditCardService) {}

  @Get(`/`)
  @TransformResponse(CONSUMER.CreditCardsListResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardsListResponse })
  getConsumerCreditCardsList(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.CreditCardsListResponse> {
    return this.service.repository.findAndCountAll({ filter: { deletedAt: null, consumerId: identity.id } })
  }

  @Get(`/:cardId`)
  @TransformResponse(CONSUMER.CreditCardResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardResponse })
  getConsumerCreditCardById(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Param(`cardId`) cardId: string,
  ): Promise<CONSUMER.CreditCardResponse | null> {
    return this.service.repository.findOne({ deletedAt: null, id: cardId, consumerId: identity.id })
  }

  @Patch(`/:cardId`)
  @TransformResponse(CONSUMER.CreditCardResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardResponse })
  updateConsumerCreditCardById(
    @Param(`cardId`) cardId: string,
    @Body() body: CONSUMER.CreditCardUpdate,
    @ReqAuthIdentity() identity: IConsumerModel, //
  ): Promise<CONSUMER.CreditCardResponse | null> {
    return this.service.repository.updateOne({ deletedAt: null, id: cardId, consumerId: identity.id }, { ...body, consumerId: identity.id })
  }

  @Post(`/`)
  @TransformResponse(CONSUMER.CreditCardResponse)
  @ApiOkResponse({ type: CONSUMER.CreditCardResponse })
  createConsumerCreditCard(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.CreditCardCreate,
  ): Promise<CONSUMER.CreditCardResponse> {
    return this.service.repository.create({ ...body, consumerId: identity.id })
  }
}
