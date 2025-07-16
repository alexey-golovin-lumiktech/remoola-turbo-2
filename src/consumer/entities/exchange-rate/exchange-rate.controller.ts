import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel, IExchangeRateModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'
import { TransactionService } from '../transaction/transaction.service'

import { ExchangeRateService } from './exchange-rate.service'

@ApiTags(`consumer`)
@ApiTags(`exchange-rates`)
@ApiBearerAuth()
@Controller(`consumer/exchange-rates`)
export class ExchangeRateController {
  constructor(
    @Inject(ExchangeRateService) private readonly service: ExchangeRateService,
    @Inject(TransactionService) private readonly transactionService: TransactionService,
  ) {}

  @Get()
  @TransformResponse(CONSUMER.ExchangeRatesListResponse)
  @ApiOkResponse({ type: CONSUMER.ExchangeRatesListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IExchangeRateModel>,
  ): Promise<CONSUMER.ExchangeRatesListResponse> {
    Object.assign(query, { filter: { ...query?.filter, deletedAt: null } })
    return this.service.repository.findAndCountAll(query)
  }

  @Post()
  async exchangeRate(@ReqAuthIdentity() consumer: IConsumerModel, @Body() body: CONSUMER.ExchangeConsumerCurrencyBody) {
    const rate = await this.service.repository.findOne({ toCurrency: body.toCurrency, fromCurrency: body.fromCurrency })
    return this.transactionService.exchangeRate(consumer, body, rate)
  }
}
