import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { ICreditCardModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { CreditCardUpdate } from '../../../dtos/admin'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminCreditCardService } from './admin-credit-card.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/credit-cards`)
export class AdminCreditCardController {
  constructor(@Inject(AdminCreditCardService) private readonly service: AdminCreditCardService) {}

  @Get()
  @TransformResponse(ADMIN.CreditCardListResponse)
  @ApiOkResponse({ type: ADMIN.CreditCardListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<ICreditCardModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.CreditCardListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:cardId`)
  @ApiOkResponse({ type: ADMIN.CreditCardResponse })
  getById(@Param(`cardId`) cardId: string): Promise<ADMIN.CreditCardResponse> {
    return this.service.repository.findById(cardId)
  }

  @Put(`/:cardId`)
  updateById(@Param(`cardId`) cardId: string, @Body() body: CreditCardUpdate) {
    return this.service.repository.updateById(cardId, body)
  }

  @Delete(`/:cardId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`cardId`) cardId: string): Promise<boolean> {
    return this.service.repository.deleteById(cardId)
  }
}
