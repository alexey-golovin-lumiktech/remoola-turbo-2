import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IExchangeRateModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ReqQueryTransformPipe } from '@-/admin/pipes'
import { ADMIN } from '@-/dtos'
import { TransformResponse } from '@-/interceptors'

import { AdminExchangeRateService } from './admin-exchange-rate.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/exchange-rates`)
export class AdminExchangeRateController {
  constructor(@Inject(AdminExchangeRateService) private readonly service: AdminExchangeRateService) {}

  @Get()
  @TransformResponse(ADMIN.ExchangeRatesListResponse)
  @ApiOkResponse({ type: ADMIN.ExchangeRatesListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IExchangeRateModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.ExchangeRatesListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post()
  @ApiOkResponse({ type: ADMIN.ExchangeRateCreate })
  create(@Body() body: ADMIN.ExchangeRateCreate): Promise<ADMIN.ExchangeRateResponse> {
    return this.service.repository.create(body)
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.ExchangeRateResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.ExchangeRateResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  updateById(@Param(`id`) id: string, @Body() body: ADMIN.ExchangeRateUpdate) {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
