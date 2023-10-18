import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IExchangeRateModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { CONSUMER } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { ExchangeRateService } from './exchange-rate.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`consumer`)
@Controller(`consumer/exchange-rates`)
export class ExchangeRateController {
  constructor(@Inject(ExchangeRateService) private readonly service: ExchangeRateService) {}

  @Get(`/`)
  @TransformResponse(CONSUMER.ExchangeRatesListResponse)
  @ApiOkResponse({ type: CONSUMER.ExchangeRatesListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IExchangeRateModel>,
  ): Promise<CONSUMER.ExchangeRatesListResponse> {
    Object.assign(query, { filter: { ...query?.filter, deletedAt: null } })
    return this.service.repository.findAndCountAll(query)
  }
}
