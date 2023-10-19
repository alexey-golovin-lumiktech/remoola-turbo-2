import { Inject, Injectable } from '@nestjs/common'
import { CONSUMER } from 'src/dtos'

import { ITransactionCreate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionActionType } from '@wirebill/shared-common/enums'
import { IPaymentRequestModel, ITransactionModel, TableName } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { TransactionRepository } from '../../../repositories'

@Injectable()
export class TransactionService extends BaseService<ITransactionModel, TransactionRepository> {
  constructor(@Inject(TransactionRepository) repository: TransactionRepository) {
    super(repository)
  }

  createFromPaymentRequest(paymentRequest: IPaymentRequestModel): Promise<ITransactionModel> {
    return this.repository.create({
      paymentRequestId: paymentRequest.id,
      currencyCode: paymentRequest.currencyCode,
      type: paymentRequest.type,
      status: paymentRequest.status,

      createdBy: paymentRequest.createdBy,
      updatedBy: paymentRequest.updatedBy,
      consumerId: paymentRequest.requesterId,
      actionType: TransactionActionType.outcome,
      originAmount: -paymentRequest.amount,
    } satisfies ITransactionCreate & { consumerId: string })
  }

  async getConsumerBallance(params: CONSUMER.GetConsumerBallanceParams): Promise<CONSUMER.GetConsumerBallanceResult[]> {
    return this.repository.knex
      .from(TableName.Transaction)
      .where(`consumer_id`, params.consumerId)
      .modify(qb => !Object.values(CurrencyCode).includes(params.currencyCode) || qb.andWhere(`currency_code`, params.currencyCode))
      .sum(`origin_amount as ballance`)
      .groupBy(`currency_code`)
      .orderBy(`currency_code`, `asc`)
      .select(`currency_code as currency`)
  }
}
