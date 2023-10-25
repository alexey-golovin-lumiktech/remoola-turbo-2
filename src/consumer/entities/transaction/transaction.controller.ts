import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { TransactionService } from './transaction.service'

@ApiTags(`consumer`)
@ApiTags(`transaction`)
@ApiBearerAuth()
@Controller(`consumer/transactions`)
export class TransactionController {
  constructor(@Inject(TransactionService) private readonly service: TransactionService) {}

  @Get()
  @TransformResponse(CONSUMER.TransactionListResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionListResponse })
  getConsumerTransactionList(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.TransactionListResponse> {
    return this.service.repository.findAndCountAll({ filter: { deletedAt: null, consumerId: identity.id } })
  }

  @Post()
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  async createConsumerTransaction(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Body() body: CONSUMER.TransactionCreate,
  ): Promise<CONSUMER.TransactionResponse> {
    const now = new Date()
    return this.service.repository.create({
      ...body,
      consumerId: identity.id,
      createdAt: now,
      createdBy: identity.email,
      updatedAt: now,
      updatedBy: identity.email,
    })
  }

  @Get(`/currencies-ballance-state`)
  @TransformResponse(CONSUMER.GetConsumerBallanceResult)
  @ApiOkResponse({ type: CONSUMER.GetConsumerBallanceResult })
  getConsumerCurrenciesBallanceState(@ReqAuthIdentity() consumer: IConsumerModel): Promise<CONSUMER.GetConsumerBallanceResult[]> {
    return this.service.getConsumerCurrenciesBallanceState({ consumerId: consumer.id })
  }

  @Get(`/:transactionId/:code`)
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  getConsumerTransactionById(
    @Param(`transactionId`) transactionId: string,
    @Param(`code`) code: string,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.TransactionResponse> {
    return this.service.repository.findOne({ deletedAt: null, id: transactionId, code, consumerId: identity.id })
  }

  @Patch(`/:transactionId/:code`)
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  async updateConsumerTransactionById(
    @Param(`transactionId`) transactionId: string,
    @Param(`code`) code: string,
    @Body() body: CONSUMER.TransactionUpdate,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.TransactionResponse> {
    const now = new Date()
    return this.service.repository.updateOne(
      { id: transactionId, code, consumerId: identity.id },
      {
        ...body,
        updatedAt: now,
        updatedBy: identity.email,
      },
    )
  }
}
