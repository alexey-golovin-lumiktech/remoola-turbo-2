import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { ITransactionModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminTransactionService } from './admin-transaction.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/transaction`)
export class AdminTransactionController {
  constructor(@Inject(AdminTransactionService) private readonly service: AdminTransactionService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.TransactionListResponse)
  @ApiOkResponse({ type: ADMIN.TransactionListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<ITransactionModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.TransactionListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.TransactionResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.TransactionResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.TransactionResponse })
  updateById(@Param(`id`) id: string, @Body() body: unknown): Promise<ADMIN.TransactionResponse> {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
