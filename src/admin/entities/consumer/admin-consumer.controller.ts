import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IConsumerModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ReqQueryTransformPipe } from '@-/admin/pipes'
import { ADMIN } from '@-/dtos'
import { TransformResponse } from '@-/interceptors'

import { AdminConsumerService } from './admin-consumer.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/consumers`)
export class AdminConsumerController {
  constructor(@Inject(AdminConsumerService) private readonly service: AdminConsumerService) {}

  @Get()
  @TransformResponse(ADMIN.ConsumerListResponse)
  @ApiOkResponse({ type: ADMIN.ConsumerListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IConsumerModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.ConsumerListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post()
  @ApiOkResponse({ type: ADMIN.ConsumerResponse })
  create(@Body() body: ADMIN.ConsumerCreate): Promise<ADMIN.ConsumerResponse> {
    return this.service.create(body)
  }

  @Put(`/:consumerId`)
  @ApiOkResponse({ type: ADMIN.ConsumerResponse })
  update(@Param(`consumerId`) consumerId: string, @Body() body: ADMIN.ConsumerUpdate): Promise<ADMIN.ConsumerResponse> {
    return this.service.update(consumerId, body)
  }

  @Get(`/:consumerId`)
  @ApiOkResponse({ type: ADMIN.ConsumerResponse })
  getById(@Param(`consumerId`) consumerId: string): Promise<ADMIN.ConsumerResponse> {
    return this.service.repository.findById(consumerId)
  }

  @Delete(`/:consumerId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`consumerId`) consumerId: string): Promise<boolean> {
    return this.service.repository.deleteById(consumerId)
  }
}
