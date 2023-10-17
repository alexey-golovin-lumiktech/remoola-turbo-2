import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { TransactionService } from '../transaction/transaction.service'

import { ConsumerService } from './consumer.service'

@ApiTags(`consumer`)
@ApiBearerAuth()
@Controller(`consumer`)
export class ConsumerController {
  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(TransactionService) private readonly transactionService: TransactionService,
  ) {}

  @Get(`/`)
  @ApiOkResponse({ type: CONSUMER.ConsumerResponse })
  @TransformResponse(CONSUMER.ConsumerResponse)
  getConsumerById(@ReqAuthIdentity() identity: IConsumerModel): CONSUMER.ConsumerResponse {
    return identity
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
