import { Inject, Injectable } from '@nestjs/common'

import { ITransactionCreate } from '@wirebill/shared-common/dtos'
import { CurrencyCode, TransactionActionType, TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IExchangeRateModel, IPaymentRequestModel, ITransactionModel, TableName } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { TransactionRepository } from '../../../repositories'

@Injectable()
export class TransactionService extends BaseService<ITransactionModel, TransactionRepository> {
  constructor(@Inject(TransactionRepository) repository: TransactionRepository) {
    super(repository)
  }

  createFromPaymentRequest(paymentRequest: IPaymentRequestModel): Promise<ITransactionModel> {
    const outcomeTransaction = {
      paymentRequestId: paymentRequest.id,
      currencyCode: paymentRequest.currencyCode,
      type: paymentRequest.type,
      status: paymentRequest.status,

      createdBy: paymentRequest.createdBy,
      updatedBy: paymentRequest.updatedBy,
      actionType: TransactionActionType.outcome,
      originAmount: -paymentRequest.amount,
    } satisfies ITransactionCreate

    return this.repository.create({ ...outcomeTransaction, consumerId: paymentRequest.requesterId })
  }

  async getConsumerCurrenciesBallanceState(params: CONSUMER.GetConsumerBallanceParams): Promise<CONSUMER.GetConsumerBallanceResult[]> {
    return this.repository.knex
      .from(TableName.Transaction)
      .where(`consumer_id`, params.consumerId)
      .modify(qb => !Object.values(CurrencyCode).includes(params.currencyCode) || qb.andWhere(`currency_code`, params.currencyCode))
      .sum(`origin_amount as amount`)
      .groupBy(`currency_code`)
      .orderBy(`currency_code`, `asc`)
      .select(`currency_code`)
  }

  async exchangeRate(consumer: IConsumerModel, body: CONSUMER.ExchangeConsumerCurrencyBody, exchangeRate?: IExchangeRateModel) {
    const rate = exchangeRate?.rate ?? 1

    const common = {
      consumerId: consumer.id,
      type: TransactionType.CurrencyExchange,
      status: TransactionStatus.Completed,
      createdBy: consumer.email,
      updatedBy: consumer.email,
    }

    const outcomeTransaction = {
      ...common,
      currencyCode: body.fromCurrency,
      originAmount: -body.amount / rate,
      actionType: TransactionActionType.outcome,
    } satisfies ITransactionCreate

    const incomeTransaction = {
      ...common,
      currencyCode: body.toCurrency,
      originAmount: +body.amount,
      actionType: TransactionActionType.income,
    } satisfies ITransactionCreate

    const result = await this.repository.createMany([outcomeTransaction, incomeTransaction])
    return result
  }
}
