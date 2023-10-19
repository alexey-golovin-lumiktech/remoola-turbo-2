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
    return this.service.repository.findAndCountAll({ filter: { deletedAt: null, createdBy: identity.email } })
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
      createdAt: now,
      createdBy: identity.email,
      updatedAt: now,
      updatedBy: identity.email,
    })
  }

  @Get(`/:transactionId/:code`)
  @TransformResponse(CONSUMER.TransactionResponse)
  @ApiOkResponse({ type: CONSUMER.TransactionResponse })
  getConsumerTransactionById(
    @Param(`transactionId`) transactionId: string,
    @Param(`code`) code: string,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.TransactionResponse> {
    return this.service.repository.findOne({ deletedAt: null, id: transactionId, code, createdBy: identity.email })
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
      { id: transactionId, code, createdBy: identity.email },
      {
        ...body,
        updatedAt: now,
        updatedBy: identity.email,
      },
    )
  }
}
